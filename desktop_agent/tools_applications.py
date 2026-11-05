"""
Application control: launch and close common Windows applications.

Launch strategy is layered for robustness:
  1. Try a known executable / shell verb (fastest, most reliable).
  2. Fall back to the Windows "where"/App Paths lookup via `start`.

Closing uses taskkill on the matching process image name, with a graceful
grace period so apps can save work.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, Optional

from .registry import ToolError, register

# Canonical app key -> (launch_command, kind)
#   kind == "exe"   : launch_command is the executable name (resolved via PATH/App Paths)
#   kind == "shell" : launch_command is a shell builtin verb run with cmd /c
#   kind == "uwp"   : launch_command is an apps-family activation string
APP_COMMANDS: Dict[str, Dict[str, str]] = {
    "notepad": {"exe": "notepad.exe", "image": "notepad.exe", "label": "Notepad"},
    "chrome": {"exe": "chrome.exe", "image": "chrome.exe", "label": "Google Chrome"},
    "edge": {"exe": "msedge.exe", "image": "msedge.exe", "label": "Microsoft Edge"},
    "vscode": {"exe": "code.cmd", "image": "Code.exe", "label": "Visual Studio Code"},
    "calculator": {"shell": "calc", "image": "CalculatorApp.exe", "label": "Calculator"},
    "calc": {"shell": "calc", "image": "CalculatorApp.exe", "label": "Calculator"},
    "file explorer": {"shell": "explorer", "image": "explorer.exe", "label": "File Explorer"},
    "explorer": {"shell": "explorer", "image": "explorer.exe", "label": "File Explorer"},
    "task manager": {"shell": "taskmgr", "image": "Taskmgr.exe", "label": "Task Manager"},
    "taskmanager": {"shell": "taskmgr", "image": "Taskmgr.exe", "label": "Task Manager"},
    "settings": {"uwp": "ms-settings:", "image": "SystemSettings.exe", "label": "Settings"},
    "command prompt": {"exe": "cmd.exe", "image": "cmd.exe", "label": "Command Prompt"},
    "cmd": {"exe": "cmd.exe", "image": "cmd.exe", "label": "Command Prompt"},
    "powershell": {"exe": "powershell.exe", "image": "powershell.exe", "label": "PowerShell"},
    "wordpad": {"shell": "write", "image": "wordpad.exe", "label": "WordPad"},
    "paint": {"shell": "mspaint", "image": "mspaint.exe", "label": "Paint"},
    "snipping tool": {"uwp": "ms-screenclip:", "image": "ScreenClippingHost.exe", "label": "Snipping Tool"},
}


def _resolve_app(key: str) -> Dict[str, str]:
    norm = (key or "").strip().lower()
    if norm in APP_COMMANDS:
        return APP_COMMANDS[norm]
    # Allow loose aliases (e.g. "code", "visual studio code").
    aliases = {
        "code": "vscode",
        "visual studio code": "vscode",
        "vs code": "vscode",
        "google chrome": "chrome",
        "microsoft edge": "edge",
        "calc": "calculator",
        "settings app": "settings",
        "file explorer": "file explorer",
        "windows explorer": "file explorer",
    }
    if norm in aliases and aliases[norm] in APP_COMMANDS:
        return APP_COMMANDS[aliases[norm]]
    raise ToolError(
        f"Unrecognized application '{key}'. Supported: "
        f"{', '.join(sorted({v['label'] for v in APP_COMMANDS.values()}))}."
    )


def _launch(spec: Dict[str, str]) -> None:
    try:
        if "exe" in spec:
            exe = spec["exe"]
            if shutil.which(exe) or exe.lower().endswith(".exe"):
                # Detached so we don't block the agent.
                subprocess.Popen(
                    [exe],
                    shell=False,
                    close_fds=True,
                    creationflags=getattr(subprocess, "DETACHED_PROCESS", 0)
                    | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0),
                )
            else:
                # e.g. `code.cmd` lives in PATH; rely on shell resolution.
                subprocess.Popen(f'start "" "{exe}"', shell=True, close_fds=True)
        elif "shell" in spec:
            subprocess.Popen(
                f'start "" {spec["shell"]}', shell=True, close_fds=True
            )
        elif "uwp" in spec:
            subprocess.Popen(
                f'start "" {spec["uwp"]}', shell=True, close_fds=True
            )
        else:
            raise ToolError(f"App spec for {spec.get('label')} is incomplete.")
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Could not launch {spec.get('label')}: {e}") from e


@register("openApplication")
def open_application(args: Dict[str, Any]) -> Dict[str, Any]:
    name = args.get("name") or args.get("application") or args.get("path")
    if not name:
        raise ToolError("Parameter 'name' (application name) is required.")
    raw_name = str(name).strip()
    
    # Check if this is an executable file or path (e.g. setup.exe, app.bat, or has slashes)
    lower_name = raw_name.lower()
    if (
        lower_name.endswith((".exe", ".msi", ".bat", ".cmd", ".ps1", ".vbs"))
        or os.path.sep in raw_name
        or "/" in raw_name
        or (len(raw_name) > 2 and raw_name[1] == ":")
    ):
        return execute_file({"path": raw_name, "args": args.get("args")})

    try:
        spec = _resolve_app(raw_name)
        _launch(spec)
        return {"result": f"{spec['label']} opened."}
    except ToolError as e:
        # Fallback: Check if it's an executable file located in Downloads or Desktop or PATH
        try:
            return execute_file({"path": raw_name, "args": args.get("args")})
        except Exception:
            raise e


@register("executeFile")
def execute_file(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute/launch an executable file (.exe, .msi, .bat, .cmd, installer, etc.) anywhere on the PC.
    If only a filename is passed (e.g. 'setup.exe', 'MYRAA-Setup-1.0.0.exe'), automatically
    locates it in Downloads, Desktop, or the specified folder and launches it.
    """
    path_param = args.get("path") or args.get("name") or args.get("file")
    folder_param = args.get("folder") or args.get("under")
    cmd_args = args.get("args") or []
    as_admin = bool(args.get("as_admin", False))

    if not path_param:
        raise ToolError("Parameter 'path' or 'name' of the executable file is required.")

    raw_path = str(path_param).strip()
    home = Path(os.path.expanduser("~"))

    # Folder candidate locations to search
    candidate_folders: list[Path] = []
    if folder_param:
        f_norm = str(folder_param).strip().lower()
        if f_norm == "downloads":
            candidate_folders.append(home / "Downloads")
        elif f_norm == "desktop":
            candidate_folders.append(home / "Desktop")
        else:
            candidate_folders.append(Path(os.path.expandvars(os.path.expanduser(str(folder_param)))).resolve())
    else:
        candidate_folders.extend([
            home / "Downloads",
            home / "Desktop",
            Path(os.getcwd()),
            Path(os.getcwd()) / "Installation",
            home / "Documents",
        ])

    target_path: Optional[Path] = None

    # 1. Direct path check
    direct_p = Path(os.path.expandvars(os.path.expanduser(raw_path))).resolve()
    if direct_p.exists() and direct_p.is_file():
        target_path = direct_p

    # 2. Check within candidate folders
    if not target_path:
        for folder in candidate_folders:
            if not folder.exists():
                continue
            # Exact match inside folder
            candidate = folder / raw_path
            if candidate.exists() and candidate.is_file():
                target_path = candidate.resolve()
                break
            # Case-insensitive match or auto .exe extension
            clean_name = raw_path.lower()
            if not clean_name.endswith(".exe"):
                clean_name_exe = clean_name + ".exe"
            else:
                clean_name_exe = clean_name

            for item in folder.iterdir():
                if item.is_file():
                    item_name_lower = item.name.lower()
                    if item_name_lower == clean_name or item_name_lower == clean_name_exe:
                        target_path = item.resolve()
                        break
                    # Partial / prefix match for installer names (e.g. 'myraa' -> 'MYRAA-Setup-1.0.0.exe')
                    if clean_name in item_name_lower and item_name_lower.endswith(".exe"):
                        target_path = item.resolve()
                        break
            if target_path:
                break

    # 3. Check system PATH
    if not target_path:
        which_path = shutil.which(raw_path)
        if which_path:
            target_path = Path(which_path)

    if not target_path or not target_path.exists():
        raise ToolError(
            f"Executable file '{raw_path}' not found. Searched in Downloads, Desktop, and system folders. "
            "Please check the filename or provide the full path."
        )

    # Convert args to list of strings
    if isinstance(cmd_args, str):
        cmd_args = [cmd_args]
    elif not isinstance(cmd_args, list):
        cmd_args = []
    str_args = [str(a) for a in cmd_args]

    # Launch execution
    try:
        if platform.system() == "Windows":
            if as_admin:
                # PowerShell Start-Process with -Verb RunAs for administrator privileges
                arg_string = " ".join([f'"{a}"' for a in str_args])
                ps_cmd = f'Start-Process -FilePath "{target_path}"'
                if arg_string:
                    ps_cmd += f' -ArgumentList "{arg_string}"'
                ps_cmd += ' -Verb RunAs'
                subprocess.Popen(["powershell", "-NoProfile", "-Command", ps_cmd], close_fds=True)
                return {
                    "result": f"Executed '{target_path.name}' as Administrator.",
                    "path": str(target_path),
                    "as_admin": True,
                }
            else:
                # Detached execution so agent does not hang or block
                flags = getattr(subprocess, "DETACHED_PROCESS", 0) | getattr(
                    subprocess, "CREATE_NEW_PROCESS_GROUP", 0
                )
                proc = subprocess.Popen(
                    [str(target_path)] + str_args,
                    cwd=str(target_path.parent),
                    close_fds=True,
                    creationflags=flags,
                )
                return {
                    "result": f"Successfully launched executable: {target_path.name}",
                    "path": str(target_path),
                    "pid": proc.pid,
                }
        else:
            proc = subprocess.Popen([str(target_path)] + str_args, close_fds=True)
            return {"result": f"Launched: {target_path}", "path": str(target_path), "pid": proc.pid}
    except Exception as e:
        # Fallback to os.startfile on Windows
        if platform.system() == "Windows":
            try:
                os.startfile(str(target_path))
                return {"result": f"Opened executable with system shell: {target_path.name}", "path": str(target_path)}
            except Exception as e2:
                raise ToolError(f"Could not execute '{target_path}': {e2}") from e2
        raise ToolError(f"Could not execute '{target_path}': {e}") from e


@register("closeApplication")
def close_application(args: Dict[str, Any]) -> Dict[str, Any]:
    name = args.get("name") or args.get("application")
    force = bool(args.get("force", False))
    if not name:
        raise ToolError("Parameter 'name' (application name) is required.")
    spec = _resolve_app(str(name))
    image = spec["image"]
    # Graceful close first (WM_CLOSE via taskkill), then force if requested.
    graceful_flag = "" if force else ""
    force_flag = " /F" if force else ""
    try:
        # taskkill returns non-zero if the process isn't running — that's fine.
        subprocess.run(
            f'taskkill /IM "{image}"{graceful_flag}{force_flag}',
            shell=True,
            capture_output=True,
            timeout=10,
        )
    except Exception as e:  # noqa: BLE001
        raise ToolError(f"Could not close {spec['label']}: {e}") from e
    # Give the OS a moment to actually tear it down.
    time.sleep(0.2)
    return {"result": f"Closed {spec['label']}."}


__all__ = ["open_application", "close_application", "execute_file", "APP_COMMANDS"]
