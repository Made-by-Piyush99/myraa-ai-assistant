"""
Website control: open named sites or arbitrary URLs in the default browser.

Uses the OS default-browser handler so the user's real Chrome/Edge/Firefox
opens at the requested destination (independent of the Playwright automation
browser and the in-app holographic BrowserAgent).
"""

from __future__ import annotations

import os
import subprocess
import webbrowser
from typing import Any, Dict, Optional
from urllib.parse import quote

from .registry import ToolError, register

# Named shortcuts the model can request by friendly name.
SITE_URLS: Dict[str, str] = {
    "youtube": "https://www.youtube.com",
    "gmail": "https://mail.google.com",
    "chatgpt": "https://chatgpt.com",
    "openai": "https://chat.openai.com",
    "google": "https://www.google.com",
    "github": "https://github.com",
    "wikipedia": "https://www.wikipedia.org",
    "reddit": "https://www.reddit.com",
    "twitter": "https://twitter.com",
    "x": "https://x.com",
    "instagram": "https://www.instagram.com",
    "facebook": "https://www.facebook.com",
    "linkedin": "https://www.linkedin.com",
    "maps": "https://maps.google.com",
    "translate": "https://translate.google.com",
    "drive": "https://drive.google.com",
    "calendar": "https://calendar.google.com",
    "amazon": "https://www.amazon.com",
    "netflix": "https://www.netflix.com",
    "spotify": "https://open.spotify.com",
    "stack overflow": "https://stackoverflow.com",
    "stackoverflow": "https://stackoverflow.com",
    "huggingface": "https://huggingface.co",
}


def _normalize_url(raw: str) -> str:
    url = raw.strip()
    if not url:
        raise ToolError("Empty URL.")
    if "://" not in url:
        # Treat bare "youtube.com" as https://youtube.com
        url = "https://" + url
    return url


def open_url(url: str) -> str:
    """Open a URL in the default browser; returns the resolved URL."""
    url = _normalize_url(url)
    if os.name == "nt":
        try:
            os.startfile(url)
            return url
        except Exception:
            pass
    try:
        ok = webbrowser.open(url, new=2)
        if ok:
            return url
    except Exception:
        pass
    # Final fallback via shell start
    if os.name == "nt":
        try:
            subprocess.Popen(f'start "" "{url}"', shell=True)
            return url
        except Exception:
            pass
    return url


@register("openWebsite")
def open_website(args: Dict[str, Any]) -> Dict[str, Any]:
    name = args.get("name")
    url = args.get("url")
    if name and not url:
        key = str(name).strip().lower()
        if key in SITE_URLS:
            url = SITE_URLS[key]
        else:
            # Treat the name itself as a domain if it looks like one.
            url = str(name)
    if not url and not name:
        raise ToolError("Provide 'name' (e.g. 'youtube') or 'url'.")
    resolved = open_url(url or str(name))
    return {"result": f"Opened {resolved} in the default browser."}


# Expose for sibling modules (tools_search).
def _build_search_url(engine: str, query: str) -> str:
    q = quote(query)
    base = {
        "google": f"https://www.google.com/search?q={q}",
        "youtube": f"https://www.youtube.com/results?search_query={q}",
        "github": f"https://github.com/search?q={q}&type=repositories",
        "chatgpt": f"https://www.google.com/search?q={q}",  # no search API
        "duckduckgo": f"https://duckduckgo.com/?q={q}",
        "bing": f"https://www.bing.com/search?q={q}",
        "amazon": f"https://www.amazon.com/s?k={q}",
        "wikipedia": f"https://en.wikipedia.org/w/index.php?search={q}",
    }
    if engine not in base:
        raise ToolError(
            f"Unsupported search engine '{engine}'. Choose from "
            f"{', '.join(sorted(base))}."
        )
    return base[engine]


def find_chrome_path() -> Optional[str]:
    """Discover real installed Google Chrome executable on Windows."""
    try:
        import winreg
        for root in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                with winreg.OpenKey(root, r"Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe") as k:
                    val, _ = winreg.QueryValueEx(k, "")
                    if val and os.path.exists(val):
                        return val
            except Exception:
                pass
    except Exception:
        pass

    for candidate in [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]:
        if os.path.exists(candidate):
            return candidate
    return None


@register("openChrome")
def open_chrome(args: Dict[str, Any]) -> Dict[str, Any]:
    """Launch or navigate the user's real Google Chrome browser."""
    raw_url = args.get("url") or "https://www.google.com"
    url = _normalize_url(str(raw_url))
    chrome_exe = find_chrome_path()
    if chrome_exe:
        try:
            subprocess.Popen([chrome_exe, url], shell=False)
            return {"result": f"Opened {url} in Google Chrome.", "chromePath": chrome_exe}
        except Exception as e:
            raise ToolError(f"Failed to launch Chrome: {e}")
    else:
        resolved = open_url(url)
        return {"result": f"Chrome binary not detected at standard path; opened {resolved} in default browser."}


@register("chromeSearch")
def chrome_search(args: Dict[str, Any]) -> Dict[str, Any]:
    """Search Google or YouTube directly inside real Google Chrome."""
    query = args.get("query") or args.get("q")
    if not query:
        raise ToolError("Parameter 'query' is required.")
    search_type = (args.get("type") or "google").strip().lower()
    if search_type == "youtube":
        url = f"https://www.youtube.com/results?search_query={quote(str(query))}"
    else:
        url = f"https://www.google.com/search?q={quote(str(query))}"
    return open_chrome({"url": url})


__all__ = [
    "open_website",
    "open_chrome",
    "chrome_search",
    "find_chrome_path",
    "open_url",
    "SITE_URLS",
    "_build_search_url"
]
