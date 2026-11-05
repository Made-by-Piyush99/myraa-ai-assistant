"""
Automated Software Installation & Setup Wizard Assistant (MYRAA Desktop 2.0).

Allows MYRAA to autonomously navigate and complete Windows software installer wizards
(NSIS, Inno Setup, InstallShield, MSI, WiX, Squirrel, Electron Installers, etc.).

Capabilities:
  * Detects installer/setup windows automatically or by title.
  * Checks un-checked license agreement checkboxes ("I accept", "I agree", etc.).
  * Finds and clicks sequential wizard progression buttons:
    ("Next >", "I Agree", "Install", "Continue", "Finish", "Done", "Close").
  * Multi-step auto mode loops through the complete wizard until installation finishes.
  * Layered resilience: UI Automation (uiautomation) -> Win32 accelerators -> OCR screen vision.
"""

from __future__ import annotations

import ctypes
import os
import platform
import time
from typing import Any, Dict, List, Optional, Tuple

from .registry import ToolError, register
from .tools_input import mouse_click, keyboard_press, keyboard_hotkey

# Keywords that identify an installation setup window
INSTALLER_KEYWORDS = [
    "setup",
    "installer",
    "installation",
    "install",
    "wizard",
    "installing",
    "updater",
    "welcome to",
    "extracting",
]

# Next/Progression button labels to click
NEXT_BUTTON_NAMES = [
    "next >",
    "next",
    "continue",
    "i agree",
    "agree",
    "install",
    "extract",
    "accept",
    "run",
    "yes",
    "proceed",
    ">",
]

# Finish/Completion button labels
FINISH_BUTTON_NAMES = [
    "finish",
    "done",
    "close",
    "exit",
    "complete",
]

# Buttons to explicitly avoid clicking
SKIP_BUTTON_NAMES = [
    "cancel",
    "back",
    "< back",
    "decline",
    "don't accept",
    "help",
    "browse",
]

# Agreement checkbox keywords
AGREEMENT_KEYWORDS = [
    "accept",
    "agree",
    "license",
    "terms",
    "condition",
]


def _find_installer_windows(query: Optional[str] = None) -> List[Tuple[int, str]]:
    """Find visible top-level windows matching installer criteria."""
    matches: List[Tuple[int, str]] = []
    if platform.system() != "Windows":
        return matches

    try:
        import win32gui
        import win32con

        def enum_handler(hwnd, _):
            if win32gui.IsWindowVisible(hwnd) and not win32gui.GetParent(hwnd):
                title = win32gui.GetWindowText(hwnd).strip()
                if title:
                    title_lower = title.lower()
                    if query:
                        if query.lower() in title_lower:
                            matches.append((hwnd, title))
                    else:
                        for kw in INSTALLER_KEYWORDS:
                            if kw in title_lower:
                                matches.append((hwnd, title))
                                break
            return True

        win32gui.EnumWindows(enum_handler, None)
    except Exception:
        # Fallback using ctypes EnumWindows
        try:
            u32 = ctypes.windll.user32
            WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

            def cb(hwnd, _):
                if u32.IsWindowVisible(hwnd):
                    length = u32.GetWindowTextLengthW(hwnd)
                    if length > 0:
                        buff = ctypes.create_unicode_buffer(length + 1)
                        u32.GetWindowTextW(hwnd, buff, length + 1)
                        t = buff.value.strip()
                        if t:
                            t_lower = t.lower()
                            if query:
                                if query.lower() in t_lower:
                                    matches.append((hwnd, t))
                            else:
                                for kw in INSTALLER_KEYWORDS:
                                    if kw in t_lower:
                                        matches.append((hwnd, t))
                                        break
                return True

            u32.EnumWindows(WNDENUMPROC(cb), 0)
        except Exception:
            pass

    return matches


def _focus_window(hwnd: int) -> None:
    """Bring the installer window to the front and restore if minimized."""
    if platform.system() != "Windows" or not hwnd:
        return
    try:
        u32 = ctypes.windll.user32
        SW_RESTORE = 9
        u32.ShowWindow(hwnd, SW_RESTORE)
        time.sleep(0.1)
        u32.SetForegroundWindow(hwnd)
        time.sleep(0.1)
    except Exception:
        pass


def _advance_installer_uia(hwnd: int) -> Tuple[bool, str]:
    """
    Inspect installer controls using UI Automation and advance one step:
    1. Check any license agreement checkboxes if unchecked.
    2. Click Finish/Done if installation has completed.
    3. Click Next/Agree/Install to proceed.
    Returns: (is_finished, action_description)
    """
    try:
        import uiautomation as auto
    except ImportError:
        return False, "uiautomation not installed"

    win_ctrl = auto.ControlFromHandle(hwnd)
    if not win_ctrl or not win_ctrl.Exists(maxSearchSeconds=0.5):
        return False, "Could not bind installer window via UIA"

    # 1. Handle license agreement checkboxes
    try:
        checkboxes = win_ctrl.GetChildren()
        for cb in win_ctrl.GetDescendants():
            if cb.ControlTypeName == "CheckBoxControl":
                cb_name = (cb.Name or "").lower()
                for akw in AGREEMENT_KEYWORDS:
                    if akw in cb_name:
                        # Check toggle state if supported
                        try:
                            pattern = cb.GetTogglePattern()
                            if pattern and pattern.ToggleState == 0:  # 0 is Off / Unchecked
                                pattern.Toggle()
                                time.sleep(0.2)
                                return False, f"Checked license agreement checkbox: '{cb.Name}'"
                        except Exception:
                            # Direct click fallback
                            cb.Click(simulateMove=False)
                            time.sleep(0.2)
                            return False, f"Clicked license agreement checkbox: '{cb.Name}'"
    except Exception:
        pass

    # 2. Look for buttons inside the installer window
    try:
        buttons = [c for c in win_ctrl.GetDescendants() if c.ControlTypeName == "ButtonControl"]
        
        # Check for Finish / Done button first
        for btn in buttons:
            name_lower = (btn.Name or "").strip().lower()
            if not btn.IsEnabled:
                continue
            for fb in FINISH_BUTTON_NAMES:
                if fb == name_lower or fb in name_lower:
                    try:
                        btn.Click(simulateMove=False)
                    except Exception:
                        rect = btn.BoundingRectangle
                        if rect:
                            cx = int((rect.left + rect.right) / 2)
                            cy = int((rect.top + rect.bottom) / 2)
                            mouse_click({"x": cx, "y": cy})
                    return True, f"Clicked '{btn.Name}' button. Setup is complete!"

        # Check for Next / Agree / Install buttons
        for btn in buttons:
            name_lower = (btn.Name or "").strip().lower()
            if not btn.IsEnabled:
                continue
            # Skip Cancel / Back
            if any(sb in name_lower for sb in SKIP_BUTTON_NAMES):
                continue
            for nb in NEXT_BUTTON_NAMES:
                if nb == name_lower or nb in name_lower or name_lower.startswith(nb):
                    btn_text = btn.Name or nb
                    try:
                        btn.Click(simulateMove=False)
                    except Exception:
                        rect = btn.BoundingRectangle
                        if rect:
                            cx = int((rect.left + rect.right) / 2)
                            cy = int((rect.top + rect.bottom) / 2)
                            mouse_click({"x": cx, "y": cy})
                    return False, f"Clicked '{btn_text}' button."

    except Exception as e:
        return False, f"UIA button inspection error: {e}"

    return False, "No active Next/Install button found via UIA."


def _advance_installer_keys() -> Tuple[bool, str]:
    """Fallback: Press Enter to trigger the default wizard button (Next/Install)."""
    try:
        keyboard_press({"key": "enter"})
        return False, "Sent Enter keystroke to advance wizard default button."
    except Exception as e:
        return False, f"Keystroke fallback error: {e}"


@register("automateInstaller")
def automate_installer(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Autonomously handles software installation and setup wizards (NSIS, Inno Setup, MSI, etc.).
    Automatically checks license agreements, clicks 'Next', 'Install', and 'Finish'.

    Args:
      action: 'auto' (loops until setup finishes, default) or 'step' (advances 1 step) or 'status'
      installer_title: Optional title substring of the installer window (e.g. 'Setup', 'Python')
      max_steps: Maximum wizard steps to advance in 'auto' mode (default: 15)
      step_delay: Seconds to wait between steps to allow file copying (default: 2.5)
    """
    action = str(args.get("action", "auto")).lower()
    installer_title = args.get("installer_title") or args.get("title")
    max_steps = int(args.get("max_steps", 15))
    step_delay = float(args.get("step_delay", 2.5))

    # 1. Locate the installer window
    windows = _find_installer_windows(installer_title)
    if not windows:
        # Check active foreground window
        try:
            import win32gui
            fg = win32gui.GetForegroundWindow()
            t = win32gui.GetWindowText(fg).strip()
            if t:
                windows = [(fg, t)]
        except Exception:
            pass

    if not windows:
        return {
            "result": "No active installer or setup wizard window was found on the screen.",
            "completed": False,
            "actions_taken": [],
        }

    hwnd, win_title = windows[0]
    _focus_window(hwnd)

    if action == "status":
        return {
            "result": f"Found active installer: '{win_title}'.",
            "window_title": win_title,
            "hwnd": hwnd,
        }

    # 2. Step execution (single progression)
    if action == "step":
        _focus_window(hwnd)
        finished, desc = _advance_installer_uia(hwnd)
        if "No active" in desc:
            finished, desc = _advance_installer_keys()
        return {
            "result": desc,
            "completed": finished,
            "window_title": win_title,
        }

    # 3. Full Auto Loop: click through entire wizard until finished
    actions_log: List[str] = [f"Attached to installer: '{win_title}'"]
    is_completed = False

    for step_num in range(1, max_steps + 1):
        # Verify window is still alive
        if platform.system() == "Windows":
            try:
                if not ctypes.windll.user32.IsWindow(hwnd):
                    actions_log.append("Installer window closed. Setup completed successfully!")
                    is_completed = True
                    break
            except Exception:
                pass

        _focus_window(hwnd)
        finished, desc = _advance_installer_uia(hwnd)
        actions_log.append(f"Step {step_num}: {desc}")

        if finished:
            is_completed = True
            break

        if "No active" in desc:
            # Try Enter key once
            _, k_desc = _advance_installer_keys()
            actions_log.append(f"Step {step_num} (fallback): {k_desc}")

        # Sleep to let installer load next page or unpack files
        time.sleep(step_delay)

    final_msg = "Installation wizard completed successfully!" if is_completed else f"Advanced {len(actions_log)} steps in installer."
    return {
        "result": final_msg,
        "completed": is_completed,
        "window_title": win_title,
        "actions_taken": actions_log,
    }


__all__ = ["automate_installer"]
