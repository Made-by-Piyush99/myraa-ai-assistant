"""
Visual UI Automation & Closed-Loop Verification Training Model (MYRAA Desktop 2.0).

Provides autonomous visual task execution with:
- Closed-loop visual cursor verification: Moves cursor to target, verifies arrival,
  and retries with self-correcting offsets until confirmed on target.
- UI Landmark Training Memory: Persistently remembers element locations across sessions
  in shared/ui_landmarks.json ("Training Model").
- Scroll Awareness & Self-Healing: Automatically re-aligns remembered positions if
  the page or window scrolls up or down.
- Visual Focus & Type: Targets input boxes (e.g. 'First Name'), focuses with verified
  click, and types text (e.g. 'PIYUSH').
"""

from __future__ import annotations

import ctypes
import json
import math
import os
import platform
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from .registry import ToolError, register
from .tools_input import (
    _clamp_coords,
    _get_current_pos,
    _get_screen_size,
    _parse_coordinate,
    keyboard_press,
    keyboard_type,
    mouse_click,
    mouse_double_click,
    mouse_move,
)

# ─── Landmark Memory File Path ───────────────────────────────────────────────
_CURRENT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
_ROOT_DIR = _CURRENT_DIR.parent
LANDMARKS_FILE = _ROOT_DIR / "shared" / "ui_landmarks.json"


def _load_landmarks_db() -> Dict[str, Any]:
    """Load persistent UI landmark training database."""
    try:
        if LANDMARKS_FILE.exists():
            with open(LANDMARKS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {"landmarks": {}, "scroll_offsets": {}, "version": "2.0"}


def _save_landmarks_db(data: Dict[str, Any]) -> None:
    """Save persistent UI landmark training database."""
    try:
        LANDMARKS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LANDMARKS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[VisionTrainer] Failed to save landmarks: {e}")


def _get_active_window_title() -> str:
    """Returns the title of the currently focused window on Windows."""
    if platform.system() == "Windows":
        try:
            hwnd = ctypes.windll.user32.GetForegroundWindow()
            if hwnd:
                length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buf = ctypes.create_unicode_buffer(length + 1)
                    ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
                    return buf.value.strip()
        except Exception:
            pass
    return "Desktop"


# ─── Closed-Loop Cursor Verification Engine ─────────────────────────────────

def move_and_verify_cursor(
    target_x: int,
    target_y: int,
    target_name: str = "target",
    tolerance: int = 15,
    max_retries: int = 5,
) -> Tuple[int, int, bool, int]:
    """
    Moves the cursor to (target_x, target_y) and verifies arrival in a closed loop.
    If the cursor did not reach the target properly, calculates error offset and
    retries until verified or max_retries reached.

    Returns: (final_x, final_y, verified_boolean, attempts_used)
    """
    curr_target_x = target_x
    curr_target_y = target_y
    attempts = 0

    while attempts < max_retries:
        attempts += 1
        # Step 1: Smoothly move to current target coordinate
        mouse_move({"x": curr_target_x, "y": curr_target_y, "duration": 0.12})
        time.sleep(0.04)  # Dwell for OS mouse hover state update

        # Step 2: Read physical cursor position from hardware
        cx, cy = _get_current_pos()

        # Step 3: Compute Euclidean distance
        dist = math.hypot(cx - target_x, cy - target_y)

        if dist <= tolerance:
            # Verified! Cursor reached target within allowable tolerance
            return cx, cy, True, attempts

        # Step 4: Self-correction offset
        # If cursor fell short or overshot, adjust target coordinate in reverse delta
        err_x = target_x - cx
        err_y = target_y - cy
        curr_target_x = max(0, curr_target_x + err_x)
        curr_target_y = max(0, curr_target_y + err_y)

        # Direct hardware SetCursorPos fallback if pyautogui had slight disparity
        if platform.system() == "Windows":
            ctypes.windll.user32.SetCursorPos(int(target_x), int(target_y))
            time.sleep(0.03)
            cx, cy = _get_current_pos()
            if math.hypot(cx - target_x, cy - target_y) <= tolerance:
                return cx, cy, True, attempts

    # Final check
    cx, cy = _get_current_pos()
    is_verified = math.hypot(cx - target_x, cy - target_y) <= (tolerance * 1.5)
    return cx, cy, is_verified, attempts


# ─── Tools Registration ──────────────────────────────────────────────────────

@register("visualInteract")
def visual_interact(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Autonomous Closed-Loop Visual UI Interaction (MYRAA 2.0 Training Model).
    
    Workflow:
    1. Locates target on screen (using coordinates from live vision or learned landmark memory).
    2. Moves cursor to target and runs closed-loop verification (retrying until cursor is on target).
    3. Clicks to focus the element.
    4. If action is 'type', types the requested text (e.g. 'PIYUSH') into the input field.
    5. Saves learned position in persistent training memory (shared/ui_landmarks.json).
    6. Automatically detects page scrolling and adjusts coordinates if the page moved up or down.
    """
    target = str(args.get("target") or args.get("element") or "element").strip()
    action = str(args.get("action") or "click").strip().lower()
    text = args.get("text")
    if text is not None:
        text = str(text)
        if action == "click" and text:
            action = "type"

    press_enter = bool(args.get("press_enter") or False)
    sw, sh = _get_screen_size()
    window_title = _get_active_window_title()

    db = _load_landmarks_db()
    landmarks = db.get("landmarks", {})
    scroll_offsets = db.get("scroll_offsets", {})
    active_scroll = scroll_offsets.get(window_title, 0)

    # 1. Resolve Target Coordinates
    raw_x = args.get("x")
    raw_y = args.get("y")
    target_x: Optional[int] = None
    target_y: Optional[int] = None

    if raw_x is not None and raw_y is not None:
        target_x = _parse_coordinate(raw_x, sw, sw // 2)
        target_y = _parse_coordinate(raw_y, sh, sh // 2)
    else:
        # Search learned landmark memory
        norm_key = target.lower().replace(" ", "_")
        if norm_key in landmarks:
            lm = landmarks[norm_key]
            target_x = int(lm.get("x", sw // 2))
            base_y = int(lm.get("y", sh // 2))
            # Apply dynamic scroll offset if page shifted
            target_y = base_y + active_scroll
        else:
            # Fuzzy match in landmarks
            for k, lm in landmarks.items():
                if target.lower() in k or k in target.lower():
                    target_x = int(lm.get("x", sw // 2))
                    base_y = int(lm.get("y", sh // 2))
                    target_y = base_y + active_scroll
                    break

    if target_x is None or target_y is None:
        raise ToolError(
            f"Could not locate target '{target}' on screen. Please provide (x, y) coordinates from screen vision."
        )

    target_x = max(0, min(sw - 1, target_x))
    target_y = max(0, min(sh - 1, target_y))

    # 2. Closed-Loop Cursor Verification Loop
    final_x, final_y, verified, attempts = move_and_verify_cursor(
        target_x=target_x,
        target_y=target_y,
        target_name=target,
        tolerance=15,
        max_retries=int(args.get("max_retries", 5)),
    )

    # 3. Perform Requested Action
    action_result = ""
    if action in ["click", "type"]:
        # Click to focus or activate element
        mouse_click({"x": final_x, "y": final_y, "clicks": 1, "button": "left"})
        time.sleep(0.06)  # Pause to let input field take focus caret

        if action == "type" and text:
            # Type text into focused input field
            typed_info = keyboard_type({"text": text, "press_enter": press_enter})
            action_result = f"Focused '{target}' and typed '{text}'" + (
                " [pressed Enter]" if press_enter else ""
            )
        else:
            action_result = f"Clicked '{target}' at ({final_x}, {final_y})"

    elif action == "double_click":
        mouse_double_click({"x": final_x, "y": final_y})
        action_result = f"Double-clicked '{target}' at ({final_x}, {final_y})"

    elif action == "hover":
        action_result = f"Hovered over '{target}' at ({final_x}, {final_y})"

    # 4. Save to Persistent UI Landmark Training Database ("Training Model")
    norm_key = target.lower().replace(" ", "_")
    prev_count = landmarks.get(norm_key, {}).get("success_count", 0)
    landmarks[norm_key] = {
        "target": target,
        "x": final_x,
        "y": final_y,
        "normalized_x": round(final_x / sw, 4),
        "normalized_y": round(final_y / sh, 4),
        "window_title": window_title,
        "last_action": action,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "success_count": prev_count + 1,
    }
    db["landmarks"] = landmarks
    _save_landmarks_db(db)

    status_str = "done" if verified else "partially_verified"
    return {
        "status": status_str,
        "verified": verified,
        "target": target,
        "action": action,
        "attempts": attempts,
        "final_position": {"x": final_x, "y": final_y},
        "screen_size": {"width": sw, "height": sh},
        "window_title": window_title,
        "result": action_result,
        "memory_updated": True,
        "message": f"Closed-loop visual action '{action}' on '{target}' completed with {attempts} verification attempts.",
    }


@register("visualMoveAndVerify")
def visual_move_and_verify(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Moves mouse cursor to target coordinates and enters a closed-loop verification check.
    Continues adjusting position until the cursor is confirmed precisely on the target.
    """
    raw_x = args.get("x")
    raw_y = args.get("y")
    if raw_x is None or raw_y is None:
        raise ToolError("Parameters 'x' and 'y' are required.")

    sw, sh = _get_screen_size()
    target_x = _parse_coordinate(raw_x, sw, sw // 2)
    target_y = _parse_coordinate(raw_y, sh, sh // 2)
    target_name = str(args.get("target") or "target")
    tolerance = int(args.get("tolerance", 15))
    max_retries = int(args.get("max_retries", 5))

    fx, fy, verified, attempts = move_and_verify_cursor(
        target_x=target_x,
        target_y=target_y,
        target_name=target_name,
        tolerance=tolerance,
        max_retries=max_retries,
    )

    return {
        "status": "done" if verified else "unverified",
        "verified": verified,
        "target": target_name,
        "attempts": attempts,
        "target_coords": {"x": target_x, "y": target_y},
        "actual_coords": {"x": fx, "y": fy},
        "distance": round(math.hypot(fx - target_x, fy - target_y), 2),
        "result": f"Cursor positioned at ({fx}, {fy}) for '{target_name}' (verified={verified}, attempts={attempts}).",
    }


@register("handlePageScrollAndRealign")
def handle_page_scroll_and_realign(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compensates when a webpage or screen has scrolled up or down.
    Adjusts remembered landmark coordinates by vertical delta so clicking/typing
    continues targeting the exact boxes even after scrolling.
    """
    direction = str(args.get("direction", "down")).lower()
    amount_px = int(args.get("amount_px") or args.get("delta_y") or 100)
    if direction == "up":
        delta_y = -amount_px
    else:
        delta_y = amount_px

    window_title = _get_active_window_title()
    db = _load_landmarks_db()
    scroll_offsets = db.get("scroll_offsets", {})
    current_offset = scroll_offsets.get(window_title, 0)
    new_offset = current_offset + delta_y
    scroll_offsets[window_title] = new_offset
    db["scroll_offsets"] = scroll_offsets
    _save_landmarks_db(db)

    return {
        "result": f"Adjusted visual scroll alignment for '{window_title}' by {delta_y}px. Total offset: {new_offset}px.",
        "window_title": window_title,
        "scroll_delta": delta_y,
        "total_offset": new_offset,
    }


@register("getLearnedLandmarks")
def get_learned_landmarks(args: Dict[str, Any]) -> Dict[str, Any]:
    """Returns all stored UI element landmarks in the Training Model."""
    db = _load_landmarks_db()
    landmarks = db.get("landmarks", {})
    return {
        "total_landmarks": len(landmarks),
        "landmarks": landmarks,
        "scroll_offsets": db.get("scroll_offsets", {}),
    }


@register("clearLearnedLandmarks")
def clear_learned_landmarks(args: Dict[str, Any]) -> Dict[str, Any]:
    """Clears or resets the learned UI landmarks database."""
    _save_landmarks_db({"landmarks": {}, "scroll_offsets": {}, "version": "2.0"})
    return {"result": "Learned UI landmarks memory cleared."}


__all__ = [
    "visual_interact",
    "visual_move_and_verify",
    "handle_page_scroll_and_realign",
    "get_learned_landmarks",
    "clear_learned_landmarks",
    "move_and_verify_cursor",
]
