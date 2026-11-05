"""
Mouse pointer and keyboard input automation for MYRAA Desktop Agent (v2.0).

Provides real-time OS-level mouse pointer control (move, click, double click,
right click, scroll, drag, cursor coordinates) and keyboard control (typing
arbitrary text with unicode/paste fallback, pressing keys, hotkeys).

DPI-Aware: Automatically configures Windows Per-Monitor DPI Awareness so
screen pixel coordinates match 1:1 regardless of display scaling (125%, 150%, 200%).
"""

from __future__ import annotations

import ctypes
import os
import platform
import subprocess
import time
from typing import Any, Dict, List, Optional, Tuple, Union

from .registry import ToolError, register

# ─── Windows Per-Monitor DPI Awareness ───────────────────────────────────────
if platform.system() == "Windows":
    try:
        # DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4
        ctypes.windll.user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
    except Exception:
        try:
            # PROCESS_PER_MONITOR_DPI_AWARE = 2
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass

# Win32 Constants for Direct Fallbacks
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
KEYEVENTF_KEYUP = 0x0002


class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]


def _get_screen_size() -> Tuple[int, int]:
    """Returns (width, height) of primary screen in true hardware pixels."""
    if platform.system() == "Windows":
        try:
            u32 = ctypes.windll.user32
            w = int(u32.GetSystemMetrics(0))
            h = int(u32.GetSystemMetrics(1))
            if w > 0 and h > 0:
                return w, h
        except Exception:
            pass
    try:
        import pyautogui
        w, h = pyautogui.size()
        return int(w), int(h)
    except Exception:
        pass
    return 1920, 1080


def _get_current_pos() -> Tuple[int, int]:
    """Returns (x, y) of current mouse cursor in true hardware pixels."""
    if platform.system() == "Windows":
        try:
            pt = POINT()
            ctypes.windll.user32.GetCursorPos(ctypes.byref(pt))
            return int(pt.x), int(pt.y)
        except Exception:
            pass
    try:
        import pyautogui
        x, y = pyautogui.position()
        return int(x), int(y)
    except Exception:
        pass
    return 0, 0


def _parse_coordinate(val: Any, total_dimension: int, current_val: int) -> int:
    """Parse coordinate supporting numbers, string numbers, percentages (e.g. '50%'), and relative fractions."""
    if val is None:
        return current_val
    if isinstance(val, (int, float)):
        # If passed as a 0.0 .. 1.0 fraction
        if 0.0 < val < 1.0:
            return int(val * total_dimension)
        return int(val)
    if isinstance(val, str):
        v = val.strip()
        if v.endswith("%"):
            try:
                pct = float(v.replace("%", "").strip())
                return int((pct / 100.0) * total_dimension)
            except Exception:
                pass
        try:
            f = float(v)
            if 0.0 < f < 1.0:
                return int(f * total_dimension)
            return int(f)
        except Exception:
            pass
    return current_val


def _clamp_coords(x: Any, y: Any) -> Tuple[int, int]:
    sw, sh = _get_screen_size()
    cur_x, cur_y = _get_current_pos()
    target_x = _parse_coordinate(x, sw, cur_x)
    target_y = _parse_coordinate(y, sh, cur_y)
    target_x = max(0, min(sw - 1, target_x))
    target_y = max(0, min(sh - 1, target_y))
    return target_x, target_y


# ─── MOUSE TOOLS ─────────────────────────────────────────────────────────────

@register("mouseMove")
def mouse_move(args: Dict[str, Any]) -> Dict[str, Any]:
    """Move the mouse pointer to (x, y) coordinates with smooth acceleration."""
    if "x" not in args or "y" not in args:
        raise ToolError("Parameters 'x' and 'y' (pixel coordinates) are required.")
    x, y = _clamp_coords(args.get("x"), args.get("y"))
    duration = float(args.get("duration", 0.15))
    duration = max(0.0, min(2.0, duration))

    moved = False
    try:
        import pyautogui
        pyautogui.moveTo(x, y, duration=duration)
        moved = True
    except Exception:
        pass

    if not moved and platform.system() == "Windows":
        ctypes.windll.user32.SetCursorPos(x, y)
        moved = True

    # Confirm position
    cx, cy = _get_current_pos()
    return {"result": f"Mouse moved to ({cx}, {cy}).", "x": cx, "y": cy}


@register("mouseClick")
def mouse_click(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Click mouse at (x, y) or at current cursor position.
    button: 'left' (default), 'right', 'middle'
    clicks: 1 (default) or 2 (double click)
    """
    button = str(args.get("button", "left")).lower().strip()
    clicks = int(args.get("clicks", 1))
    x_val = args.get("x")
    y_val = args.get("y")

    if x_val is not None and y_val is not None:
        target_x, target_y = _clamp_coords(x_val, y_val)
        # Move cursor to target position with slight dwell for window hover recognition
        mouse_move({"x": target_x, "y": target_y, "duration": 0.1})
        time.sleep(0.04)
    else:
        target_x, target_y = _get_current_pos()

    # Preferred: Win32 direct hardware-level event for 100% reliability
    if platform.system() == "Windows":
        try:
            u32 = ctypes.windll.user32
            u32.SetCursorPos(target_x, target_y)
            time.sleep(0.02)
            for i in range(clicks):
                if button == "right":
                    u32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
                    time.sleep(0.03)
                    u32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
                elif button == "middle":
                    u32.mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0)
                    time.sleep(0.03)
                    u32.mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0)
                else:
                    u32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                    time.sleep(0.03)
                    u32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                if clicks > 1 and i < clicks - 1:
                    time.sleep(0.06)
            return {
                "result": f"Clicked mouse {button} at ({target_x}, {target_y}) ({clicks}x).",
                "x": target_x,
                "y": target_y,
                "button": button,
                "clicks": clicks,
            }
        except Exception:
            pass

    # Cross-platform fallback: pyautogui
    try:
        import pyautogui
        pyautogui.click(x=target_x, y=target_y, clicks=clicks, button=button)
        return {
            "result": f"Clicked mouse {button} at ({target_x}, {target_y}) ({clicks}x).",
            "x": target_x,
            "y": target_y,
            "button": button,
            "clicks": clicks,
        }
    except Exception as e:
        raise ToolError(f"Mouse click failed: {e}")


@register("mouseDoubleClick")
def mouse_double_click(args: Dict[str, Any]) -> Dict[str, Any]:
    """Double-click the left mouse button at (x, y) or current position."""
    args["button"] = "left"
    args["clicks"] = 2
    return mouse_click(args)


@register("mouseRightClick")
def mouse_right_click(args: Dict[str, Any]) -> Dict[str, Any]:
    """Right-click at (x, y) or current cursor position (opens context menu)."""
    args["button"] = "right"
    args["clicks"] = 1
    return mouse_click(args)


@register("mouseScroll")
def mouse_scroll(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Scroll mouse wheel.
    amount: positive = up, negative = down. Default: -5 (scroll down).
    direction: 'up' or 'down' (optional alternate helper).
    """
    direction = str(args.get("direction", "")).lower()
    amount = args.get("amount") or args.get("clicks")
    if amount is None:
        amount = 5 if direction == "up" else -5
    else:
        amount = int(amount)
        if direction == "down" and amount > 0:
            amount = -amount

    if platform.system() == "Windows":
        try:
            # WHEEL_DELTA is 120
            wheel_delta = amount * 120
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, wheel_delta, 0)
            return {"result": f"Scrolled mouse wheel by {amount} units."}
        except Exception:
            pass

    try:
        import pyautogui
        pyautogui.scroll(amount)
        return {"result": f"Scrolled mouse wheel by {amount} units."}
    except Exception as e:
        raise ToolError(f"Scroll failed: {e}")


@register("mouseDrag")
def mouse_drag(args: Dict[str, Any]) -> Dict[str, Any]:
    """Drag mouse from current position to (to_x, to_y)."""
    if "to_x" not in args or "to_y" not in args:
        raise ToolError("Parameters 'to_x' and 'to_y' are required.")
    to_x, to_y = _clamp_coords(args.get("to_x"), args.get("to_y"))
    duration = float(args.get("duration", 0.5))

    try:
        import pyautogui
        pyautogui.dragTo(to_x, to_y, duration=duration, button="left")
        return {"result": f"Dragged mouse to ({to_x}, {to_y}).", "to_x": to_x, "to_y": to_y}
    except Exception as e:
        raise ToolError(f"Mouse drag failed: {e}")


@register("mouseGetPosition")
def mouse_get_position(args: Dict[str, Any]) -> Dict[str, Any]:
    """Get the current mouse pointer coordinates and primary screen resolution."""
    x, y = _get_current_pos()
    sw, sh = _get_screen_size()
    return {"x": x, "y": y, "screenWidth": sw, "screenHeight": sh}


# ─── KEYBOARD TOOLS ──────────────────────────────────────────────────────────

_KEY_ALIASES: Dict[str, str] = {
    "return": "enter",
    "ret": "enter",
    "escape": "esc",
    "spacebar": "space",
    "control": "ctrl",
    "windows": "win",
    "super": "win",
    "del": "delete",
    "ins": "insert",
    "pgup": "pageup",
    "pgdn": "pagedown",
    "arrowup": "up",
    "arrowdown": "down",
    "arrowleft": "left",
    "arrowright": "right",
}


@register("keyboardType")
def keyboard_type(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Type text into the currently active window or input field.
    Supports English, Hindi, URLs, symbols, and multi-line strings.
    If 'press_enter' is true, automatically presses Enter after typing.
    """
    text = args.get("text")
    if text is None:
        raise ToolError("Parameter 'text' is required.")
    text = str(text)
    if not text:
        return {"result": "Empty text provided."}

    press_enter = bool(args.get("press_enter") or args.get("enter") or False)
    interval = float(args.get("interval", 0.01))

    # Fast direct write for short pure-ASCII alphanumeric strings without spaces
    is_simple_ascii = len(text) < 15 and text.isalnum()

    typed = False
    if is_simple_ascii:
        try:
            import pyautogui
            pyautogui.write(text, interval=interval)
            typed = True
        except Exception:
            pass

    # Reliable clipboard paste for all text (Unicode, Hindi, spaces, punctuation, URLs, code)
    if not typed:
        try:
            import pyperclip
            pyperclip.copy(text)
            time.sleep(0.04)

            if platform.system() == "Windows":
                u32 = ctypes.windll.user32
                VK_CONTROL = 0x11
                VK_V = 0x56
                u32.keybd_event(VK_CONTROL, 0, 0, 0)
                u32.keybd_event(VK_V, 0, 0, 0)
                time.sleep(0.02)
                u32.keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0)
                u32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
                typed = True
            else:
                import pyautogui
                pyautogui.hotkey("ctrl", "v")
                typed = True
        except Exception as e:
            raise ToolError(f"Failed to type text: {e}")

    # Optional automated Enter press
    if press_enter:
        time.sleep(0.06)
        keyboard_press({"key": "enter"})

    preview = text[:40] + ("..." if len(text) > 40 else "")
    enter_msg = " [and pressed Enter]" if press_enter else ""
    return {"result": f"Typed '{preview}' ({len(text)} chars){enter_msg}."}


@register("keyboardPress")
def keyboard_press(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Press a single keyboard key (e.g. 'enter', 'tab', 'esc', 'space', 'backspace', 'win', 'up', 'down').
    """
    key = args.get("key")
    if not key:
        raise ToolError("Parameter 'key' is required (e.g. 'enter', 'tab', 'esc', 'space', 'win').")
    k = str(key).strip().lower()
    k = _KEY_ALIASES.get(k, k)

    # Windows direct keybd_event
    VK_MAP = {
        "enter": 0x0D,
        "tab": 0x09,
        "esc": 0x1B,
        "space": 0x20,
        "backspace": 0x08,
        "delete": 0x2E,
        "up": 0x26,
        "down": 0x28,
        "left": 0x25,
        "right": 0x27,
        "win": 0x5B,
        "home": 0x24,
        "end": 0x23,
    }
    if platform.system() == "Windows" and k in VK_MAP:
        try:
            vk = VK_MAP[k]
            u32 = ctypes.windll.user32
            u32.keybd_event(vk, 0, 0, 0)
            time.sleep(0.03)
            u32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
            return {"result": f"Pressed key '{k}'."}
        except Exception:
            pass

    try:
        import pyautogui
        pyautogui.press(k)
        return {"result": f"Pressed key '{k}'."}
    except Exception as e:
        raise ToolError(f"Could not press key '{k}': {e}")


@register("keyboardHotkey")
def keyboard_hotkey(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Press a combination of keys (e.g. ['ctrl', 't'] for new tab, ['ctrl', 'w'] to close tab, ['alt', 'f4'] to quit).
    """
    keys = args.get("keys")
    if not keys:
        if "hotkey" in args:
            raw = str(args["hotkey"])
            keys = [p.strip() for p in raw.replace("+", " ").split()]
        else:
            raise ToolError("Parameter 'keys' (array of key strings) is required.")

    if not isinstance(keys, list) or not keys:
        raise ToolError("Keys must be a non-empty list of key names.")

    normalized = [_KEY_ALIASES.get(str(k).strip().lower(), str(k).strip().lower()) for k in keys]

    try:
        import pyautogui
        pyautogui.hotkey(*normalized)
        return {"result": f"Triggered hotkey: {' + '.join(normalized)}."}
    except Exception as e:
        raise ToolError(f"Hotkey execution failed: {e}")


@register("openNewTab")
def open_new_tab(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Opens a brand new tab in the user's real Google Chrome / default desktop browser on their real screen.
    Use this when the user says 'new tab open karo', 'open new tab', 'open blank tab', or wants a fresh tab on their screen.
    """
    url = args.get("url")
    if url:
        from .tools_websites import open_chrome
        return open_chrome({"url": url})

    # Trigger real browser shortcut Ctrl+T on the user's desktop
    try:
        import pyautogui
        pyautogui.hotkey("ctrl", "t")
        return {"result": "Opened a new tab on your desktop browser (Ctrl+T)."}
    except Exception:
        # Fallback to launching Chrome newtab
        from .tools_websites import open_chrome
        return open_chrome({"url": "chrome://newtab"})


__all__ = [
    "mouse_move",
    "mouse_click",
    "mouse_double_click",
    "mouse_right_click",
    "mouse_scroll",
    "mouse_drag",
    "mouse_get_position",
    "keyboard_type",
    "keyboard_press",
    "keyboard_hotkey",
    "open_new_tab",
]
