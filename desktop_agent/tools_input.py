"""
Mouse pointer and keyboard input automation for MYRAA Desktop Agent.

Provides real-time OS-level mouse pointer control (move, click, double click,
right click, scroll, drag, cursor coordinates) and keyboard control (typing
arbitrary text with unicode/paste fallback, pressing keys, hotkeys).
"""

from __future__ import annotations

import ctypes
import os
import platform
import time
from typing import Any, Dict, List, Optional, Tuple

from .registry import ToolError, register

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
    """Returns (width, height) of primary screen."""
    try:
        import pyautogui
        w, h = pyautogui.size()
        return int(w), int(h)
    except Exception:
        pass
    if platform.system() == "Windows":
        try:
            u32 = ctypes.windll.user32
            return int(u32.GetSystemMetrics(0)), int(u32.GetSystemMetrics(1))
        except Exception:
            pass
    return 1920, 1080


def _get_current_pos() -> Tuple[int, int]:
    """Returns (x, y) of current mouse cursor."""
    try:
        import pyautogui
        x, y = pyautogui.position()
        return int(x), int(y)
    except Exception:
        pass
    if platform.system() == "Windows":
        try:
            pt = POINT()
            ctypes.windll.user32.GetCursorPos(ctypes.byref(pt))
            return int(pt.x), int(pt.y)
        except Exception:
            pass
    return 0, 0


def _clamp_coords(x: Optional[int], y: Optional[int]) -> Tuple[int, int]:
    sw, sh = _get_screen_size()
    cur_x, cur_y = _get_current_pos()
    target_x = cur_x if x is None else int(x)
    target_y = cur_y if y is None else int(y)
    target_x = max(0, min(sw - 1, target_x))
    target_y = max(0, min(sh - 1, target_y))
    return target_x, target_y


# ─── MOUSE TOOLS ─────────────────────────────────────────────────────────────

@register("mouseMove")
def mouse_move(args: Dict[str, Any]) -> Dict[str, Any]:
    """Move the mouse pointer to (x, y) coordinates."""
    if "x" not in args or "y" not in args:
        raise ToolError("Parameters 'x' and 'y' (pixel coordinates) are required.")
    x, y = _clamp_coords(args.get("x"), args.get("y"))
    duration = float(args.get("duration", 0.2))
    duration = max(0.0, min(3.0, duration))

    try:
        import pyautogui
        pyautogui.moveTo(x, y, duration=duration)
    except Exception:
        if platform.system() == "Windows":
            ctypes.windll.user32.SetCursorPos(x, y)
        else:
            raise ToolError("Mouse move failed: pyautogui not working on this platform.")

    return {"result": f"Mouse moved to ({x}, {y}).", "x": x, "y": y}


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
        mouse_move({"x": target_x, "y": target_y, "duration": 0.1})
    else:
        target_x, target_y = _get_current_pos()

    try:
        import pyautogui
        pyautogui.click(x=target_x, y=target_y, clicks=clicks, button=button)
        return {
            "result": f"Mouse {button} clicked at ({target_x}, {target_y}) ({clicks} click(s)).",
            "x": target_x,
            "y": target_y,
            "button": button,
        }
    except Exception:
        pass

    # Windows fallback
    if platform.system() == "Windows":
        u32 = ctypes.windll.user32
        u32.SetCursorPos(target_x, target_y)
        for _ in range(clicks):
            if button == "right":
                u32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
                time.sleep(0.02)
                u32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
            elif button == "middle":
                u32.mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0)
                time.sleep(0.02)
                u32.mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0)
            else:
                u32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                time.sleep(0.02)
                u32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            if clicks > 1:
                time.sleep(0.08)
        return {
            "result": f"Mouse {button} clicked at ({target_x}, {target_y}) via win32 fallback.",
            "x": target_x,
            "y": target_y,
            "button": button,
        }

    raise ToolError("Mouse click failed.")


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

    try:
        import pyautogui
        # pyautogui scroll takes positive for up, negative for down
        pyautogui.scroll(amount)
        return {"result": f"Scrolled mouse wheel by {amount} units."}
    except Exception:
        pass

    if platform.system() == "Windows":
        try:
            # WHEEL_DELTA is 120
            wheel_delta = amount * 120
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, wheel_delta, 0)
            return {"result": f"Scrolled mouse wheel by {amount} units (win32)."}
        except Exception as e:
            raise ToolError(f"Scroll failed: {e}")

    raise ToolError("Scroll failed.")


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
    """Get the current mouse pointer coordinates and screen resolution."""
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
    """
    text = args.get("text")
    if text is None:
        raise ToolError("Parameter 'text' is required.")
    text = str(text)
    if not text:
        return {"result": "Empty text provided."}

    interval = float(args.get("interval", 0.01))

    # Test if text contains non-ASCII characters (e.g. Hindi, Unicode symbols, emojis)
    is_pure_ascii = all(32 <= ord(c) < 127 or c in "\r\n\t" for c in text)

    try:
        import pyautogui

        if is_pure_ascii and len(text) < 100:
            # Type directly for short ASCII strings
            pyautogui.write(text, interval=interval)
        else:
            # Use clipboard paste for unicode, Hindi, long texts, or symbols
            import pyperclip
            pyperclip.copy(text)
            time.sleep(0.05)
            pyautogui.hotkey("ctrl", "v")
            time.sleep(0.05)

        return {"result": f"Typed '{text[:40]}{'...' if len(text)>40 else ''}' ({len(text)} chars)."}
    except Exception:
        pass

    # Fallback using pyperclip and win32 keybd_event
    try:
        import pyperclip
        pyperclip.copy(text)
        time.sleep(0.05)
        # Ctrl+V
        u32 = ctypes.windll.user32
        VK_CONTROL = 0x11
        VK_V = 0x56
        u32.keybd_event(VK_CONTROL, 0, 0, 0)
        u32.keybd_event(VK_V, 0, 0, 0)
        time.sleep(0.03)
        u32.keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0)
        u32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
        return {"result": f"Pasted {len(text)} characters into active window via win32 fallback."}
    except Exception as e:
        raise ToolError(f"Failed to type text: {e}")


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

    try:
        import pyautogui
        pyautogui.press(k)
        return {"result": f"Pressed key '{k}'."}
    except Exception:
        pass

    # Windows keybd_event fallback for common keys
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
            return {"result": f"Pressed key '{k}' via win32 fallback."}
        except Exception as e:
            raise ToolError(f"Press key failed: {e}")

    raise ToolError(f"Could not press key '{k}'.")


@register("keyboardHotkey")
def keyboard_hotkey(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Press a combination of keys (e.g. ['ctrl', 't'], ['ctrl', 'w'], ['alt', 'f4'], ['win', 'd']).
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
]
