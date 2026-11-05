"""
File management: create / read / rename / delete / move / open / search.

Safety model:
  * All paths are resolved with expanduser and normalized to absolute.
  * Deletion sends files/folders to the Recycle Bin via `send2trash` when
    available (preferred), and otherwise refuses to delete rather than
    permanently removing data.
  * Operations are confined to a set of SAFE_ROOTS by default; paths that
    escape these roots (e.g. C:\\Windows) are rejected unless explicitly
    marked `allow_anywhere` by the caller.
"""

from __future__ import annotations

import fnmatch
import os
import platform
import subprocess
import string
from pathlib import Path
from typing import Any, Dict, List, Optional

from .registry import ToolError, register

HOME = Path(os.path.expanduser("~"))

def _get_system_drives() -> List[Path]:
    """Detect all mounted storage drives on the computer (C:, D:, etc.)."""
    drives: List[Path] = []
    if platform.system() == "Windows":
        for letter in string.ascii_uppercase:
            drive_str = f"{letter}:\\"
            if os.path.exists(drive_str):
                drives.append(Path(drive_str))
    else:
        drives.append(Path("/"))
    return drives

SYSTEM_DRIVES = _get_system_drives()

# Roots under which file operations are permitted across the computer.
SAFE_ROOTS: List[Path] = [
    HOME,
    HOME / "Desktop",
    HOME / "Documents",
    HOME / "Downloads",
    HOME / "Pictures",
    HOME / "Music",
    HOME / "Videos",
    Path(os.getcwd()),  # project root
] + SYSTEM_DRIVES

# Friendly folder aliases -> resolved path.
FOLDER_ALIASES: Dict[str, Path] = {
    "desktop": HOME / "Desktop",
    "documents": HOME / "Documents",
    "downloads": HOME / "Downloads",
    "pictures": HOME / "Pictures",
    "photos": HOME / "Pictures",
    "music": HOME / "Music",
    "videos": HOME / "Videos",
    "home": HOME,
    "this pc": Path("C:\\"),
    "c drive": Path("C:\\"),
}

# Add drive letter aliases (c:, c drive, d:, d drive, etc.)
for letter in string.ascii_uppercase:
    drive_root = Path(f"{letter}:\\")
    l_lower = letter.lower()
    FOLDER_ALIASES[f"{l_lower} drive"] = drive_root
    FOLDER_ALIASES[f"{l_lower}:"] = drive_root
    FOLDER_ALIASES[f"{l_lower}"] = drive_root
    FOLDER_ALIASES[f"{l_lower}:\\"] = drive_root


def _resolve_folder(name_or_path: Optional[str]) -> Path:
    if not name_or_path:
        raise ToolError("Parameter 'name' or 'path' is required.")
    raw = str(name_or_path).strip()
    key = raw.lower().rstrip("/\\")
    if key in FOLDER_ALIASES:
        return FOLDER_ALIASES[key]
    # Check if single drive letter passed (e.g. "D:" or "D")
    if len(raw) == 2 and raw[1] == ":" and raw[0].upper() in string.ascii_uppercase:
        return Path(f"{raw[0].upper()}:\\")
    p = Path(os.path.expandvars(os.path.expanduser(raw))).resolve()
    return p


def _resolve_file(path: Optional[str], *, must_exist: bool = False) -> Path:
    if not path:
        raise ToolError("Parameter 'path' is required.")
    raw = str(path).strip()
    p = Path(os.path.expandvars(os.path.expanduser(raw))).resolve()
    if must_exist and not p.exists():
        raise ToolError(f"File does not exist: {p}")
    return p


# Critical OS directories protected from accidental deletion
_CRITICAL_BLOCKED_PATHS = [
    r"c:\windows\system32",
    r"c:\windows\syswow64",
    r"c:\boot",
    r"c:\recovery",
]


def _ensure_safe(p: Path, allow_anywhere: bool = False, is_destructive: bool = False) -> None:
    if allow_anywhere:
        return
    real = str(p).lower()
    
    # Protect critical OS core files from destructive deletion
    if is_destructive:
        for blocked in _CRITICAL_BLOCKED_PATHS:
            if real == blocked or real.startswith(blocked + os.sep):
                raise ToolError(f"Operation blocked: '{p}' is a protected Windows core system directory.")
        # Do not allow deleting entire root drive directly
        for drive in SYSTEM_DRIVES:
            if real == str(drive).lower().rstrip(os.sep):
                raise ToolError(f"Operation blocked: Cannot delete entire drive root '{p}'.")
    
    # Allow all existing drive paths and user folders across the computer
    for root in SAFE_ROOTS:
        try:
            root_real = str(root.resolve()).lower()
        except Exception:
            continue
        if real == root_real or real.startswith(root_real.rstrip(os.sep) + os.sep):
            return
            
    # Default permissive on any valid Windows drive
    if platform.system() == "Windows" and len(real) >= 2 and real[1] == ":":
        return

    raise ToolError(
        f"Path '{p}' is not accessible on this computer."
    )


@register("createFile")
def create_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    content = args.get("content", "")
    overwrite = bool(args.get("overwrite", False))
    p = _resolve_file(path)
    _ensure_safe(p)

    if p.exists() and not overwrite:
        raise ToolError(
            f"File already exists: {p}. Pass overwrite=true to replace it."
        )
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(str(content), encoding="utf-8")
    return {"result": f"Created file: {p}", "path": str(p)}


@register("readFile")
def read_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    max_chars = int(args.get("max_chars", 8000))
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    try:
        text = p.read_text(encoding="utf-8", errors="replace")
    except UnicodeDecodeError:
        return {"result": f"(Binary file, {p.stat().st_size} bytes): {p}"}
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n…[truncated, {len(text) - max_chars} more chars]"
    return {"result": text, "path": str(p)}


@register("renameFile")
def rename_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    new_name = args.get("new_name")
    if not new_name:
        raise ToolError("Parameter 'new_name' is required.")
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    target = (p.parent / str(new_name)).resolve()
    _ensure_safe(target)
    if target.exists():
        raise ToolError(f"A file already exists at the target name: {target}")
    p.rename(target)
    return {"result": f"Renamed {p.name} -> {target.name}", "path": str(target)}


@register("deleteFile")
def delete_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    permanent = bool(args.get("permanent", False))
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p, is_destructive=True)

    if permanent:
        if p.is_dir():
            import shutil

            shutil.rmtree(p)
        else:
            p.unlink()
        return {"result": f"Permanently deleted: {p}"}

    # Prefer recycle bin.
    try:
        import send2trash  # type: ignore

        send2trash.send2trash(str(p))
        return {"result": f"Moved to Recycle Bin: {p}"}
    except ImportError:
        raise ToolError(
            "Safe deletion requires the 'send2trash' package. Install it or pass "
            "permanent=true (use with care)."
        )
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Could not move to Recycle Bin: {e}")


@register("moveFile")
def move_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    destination = args.get("destination")
    p = _resolve_file(path, must_exist=True)
    _ensure_safe(p)
    dest = Path(os.path.expandvars(os.path.expanduser(str(destination)))).resolve()
    # If destination is an existing directory, keep the filename.
    if dest.is_dir():
        dest = dest / p.name
    _ensure_safe(dest)
    if dest.exists():
        raise ToolError(f"Destination already exists: {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    p.rename(dest)
    return {"result": f"Moved {p.name} -> {dest}", "path": str(dest)}


@register("openFolder")
def open_folder(args: Dict[str, Any]) -> Dict[str, Any]:
    folder = _resolve_folder(args.get("name") or args.get("path"))
    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")
    # Explorer on Windows, open elsewhere.
    if platform.system() == "Windows":
        subprocess.Popen(f'explorer "{folder}"', shell=True, close_fds=True)
    elif platform.system() == "Darwin":
        subprocess.Popen(["open", str(folder)], close_fds=True)
    else:
        subprocess.Popen(["xdg-open", str(folder)], close_fds=True)
    return {"result": f"Opened folder: {folder}", "path": str(folder)}


@register("listFiles")
def list_files(args: Dict[str, Any]) -> Dict[str, Any]:
    folder = _resolve_folder(args.get("name") or args.get("path"))
    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")
    pattern = args.get("pattern") or "*"
    try:
        names = sorted(
            [p.name + ("/" if p.is_dir() else "") for p in folder.glob(pattern)]
        )
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Could not list folder: {e}")
    return {
        "result": f"{len(names)} item(s) in {folder}",
        "items": names[:500],
        "count": len(names),
    }


@register("searchFiles")
def search_files(args: Dict[str, Any]) -> Dict[str, Any]:
    """Find files by name glob or extension under a folder.

    Examples:
      name="*.py" under "Documents"          -> all python files
      extension="py"                          -> same as name="*.py"
      name="report*" under "Desktop"
    """
    folder = _resolve_folder(args.get("folder") or args.get("under") or "home")
    name = args.get("name") or args.get("pattern")
    extension = args.get("extension")
    limit = int(args.get("limit", 100))

    if extension:
        if not str(extension).startswith("."):
            extension = "." + str(extension)
        pattern = "*" + str(extension)
    elif name:
        pattern = str(name)
    else:
        raise ToolError("Provide 'name' glob or 'extension'.")

    if not folder.exists():
        raise ToolError(f"Folder does not exist: {folder}")

    matches: List[str] = []
    for root, _dirs, files in os.walk(folder):
        for fname in files:
            if fnmatch.fnmatch(fname.lower(), pattern.lower()):
                matches.append(os.path.join(root, fname))
                if len(matches) >= limit:
                    break
        if len(matches) >= limit:
            break

    return {
        "result": f"Found {len(matches)} file(s) matching '{pattern}' under {folder}",
        "matches": matches,
        "count": len(matches),
    }


@register("createFolder")
def create_folder(args: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new folder/directory anywhere on the computer (Desktop, Downloads, D:, C:\\Folder, etc.)."""
    path = args.get("path")
    name = args.get("name")
    under = args.get("under") or args.get("folder")

    if path:
        target = Path(os.path.expandvars(os.path.expanduser(str(path)))).resolve()
    elif name:
        parent = _resolve_folder(under or "desktop")
        target = (parent / str(name)).resolve()
    else:
        raise ToolError("Provide 'path' or 'name' for the new folder.")

    _ensure_safe(target)
    if target.exists():
        if target.is_dir():
            return {"result": f"Folder already exists: {target}", "path": str(target), "created": False}
        raise ToolError(f"A file already exists with that name: {target}")

    target.mkdir(parents=True, exist_ok=True)
    return {"result": f"Created folder successfully: {target}", "path": str(target), "created": True}


@register("listDrives")
def list_drives(args: Dict[str, Any]) -> Dict[str, Any]:
    """List all available storage drives on the computer (C:, D:, etc.) with total and available space."""
    import shutil
    drives_info = []
    if platform.system() == "Windows":
        for letter in string.ascii_uppercase:
            drive_root = f"{letter}:\\"
            if os.path.exists(drive_root):
                try:
                    usage = shutil.disk_usage(drive_root)
                    total_gb = round(usage.total / (1024 ** 3), 2)
                    free_gb = round(usage.free / (1024 ** 3), 2)
                    used_gb = round(usage.used / (1024 ** 3), 2)
                    percent_used = round((usage.used / usage.total) * 100, 1)
                    drives_info.append({
                        "drive": f"{letter}:",
                        "path": drive_root,
                        "total_gb": total_gb,
                        "free_gb": free_gb,
                        "used_gb": used_gb,
                        "percent_used": percent_used,
                    })
                except Exception:
                    drives_info.append({"drive": f"{letter}:", "path": drive_root, "status": "mounted"})
    else:
        usage = shutil.disk_usage("/")
        drives_info.append({
            "drive": "/",
            "path": "/",
            "total_gb": round(usage.total / (1024 ** 3), 2),
            "free_gb": round(usage.free / (1024 ** 3), 2),
        })

    return {
        "result": f"Found {len(drives_info)} drive(s) on this computer.",
        "drives": drives_info,
        "count": len(drives_info),
    }


__all__ = [
    "create_file",
    "create_folder",
    "list_drives",
    "read_file",
    "rename_file",
    "delete_file",
    "move_file",
    "open_folder",
    "list_files",
    "search_files",
]
