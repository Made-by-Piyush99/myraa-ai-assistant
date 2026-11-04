"""
Search commands: open a search results page for a query on a given engine.

These launch in the user's default browser (separate from the Playwright
automation browser). For form-filling / in-page automation see tools_browser.
"""

from __future__ import annotations

import re
import urllib.request
from typing import Any, Dict
from urllib.parse import quote

from .registry import ToolError, register
from .tools_websites import _build_search_url, open_url


@register("playYouTubeMusic")
def play_youtube_music(args: Dict[str, Any]) -> Dict[str, Any]:
    """Search for a song, music, or video on YouTube and immediately start playing it with autoplay."""
    query = args.get("query") or args.get("song") or args.get("q")
    if not query:
        raise ToolError("Parameter 'query' is required.")

    video_id = None
    try:
        search_url = f"https://www.youtube.com/results?search_query={quote(str(query))}"
        req = urllib.request.Request(
            search_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            html = response.read().decode("utf-8", errors="ignore")
            match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
            if match:
                video_id = match.group(1)
    except Exception:
        pass

    if video_id:
        watch_url = f"https://www.youtube.com/watch?v={video_id}&autoplay=1"
        resolved = open_url(watch_url)
        return {"result": f"Now playing '{query}' on YouTube: {resolved}", "videoId": video_id, "url": watch_url}
    else:
        url = _build_search_url("youtube", str(query))
        resolved = open_url(url)
        return {"result": f"Opened YouTube search for '{query}' at {resolved}."}



@register("searchWeb")
def search_web(args: Dict[str, Any]) -> Dict[str, Any]:
    query = args.get("query") or args.get("q")
    engine = (args.get("engine") or "google").strip().lower()
    if not query:
        raise ToolError("Parameter 'query' is required.")
    url = _build_search_url(engine, str(query))
    resolved = open_url(url)
    return {"result": f"Searching {engine} for '{query}': opened {resolved}."}


@register("searchYouTube")
def search_youtube(args: Dict[str, Any]) -> Dict[str, Any]:
    query = args.get("query") or args.get("q")
    if not query:
        raise ToolError("Parameter 'query' is required.")
    url = _build_search_url("youtube", str(query))
    resolved = open_url(url)
    return {"result": f"YouTube search for '{query}' opened at {resolved}."}


@register("searchGoogle")
def search_google(args: Dict[str, Any]) -> Dict[str, Any]:
    query = args.get("query") or args.get("q")
    if not query:
        raise ToolError("Parameter 'query' is required.")
    url = _build_search_url("google", str(query))
    resolved = open_url(url)
    return {"result": f"Google search for '{query}' opened at {resolved}."}


@register("searchGitHub")
def search_github(args: Dict[str, Any]) -> Dict[str, Any]:
    query = args.get("query") or args.get("q")
    if not query:
        raise ToolError("Parameter 'query' is required.")
    url = _build_search_url("github", str(query))
    resolved = open_url(url)
    return {"result": f"GitHub search for '{query}' opened at {resolved}."}


@register("searchAndOpenFirstResult")
def search_and_open_first_result(args: Dict[str, Any]) -> Dict[str, Any]:
    """Search Google/web for a query and immediately navigate to/click the first result."""
    query = (args.get("query") or args.get("q") or "").strip()
    if not query:
        raise ToolError("Parameter 'query' is required.")

    # Direct canonical lookup for common sites and AI tools
    known = {
        "suno": "https://suno.com",
        "suno ai": "https://suno.com",
        "suno.ai": "https://suno.com",
        "suno music": "https://suno.com",
        "instagram": "https://www.instagram.com",
        "insta": "https://www.instagram.com",
        "facebook": "https://www.facebook.com",
        "fb": "https://www.facebook.com",
        "whatsapp": "https://web.whatsapp.com",
        "whatsapp web": "https://web.whatsapp.com",
        "chatgpt": "https://chatgpt.com",
        "chat gpt": "https://chatgpt.com",
        "openai": "https://openai.com",
        "claude": "https://claude.ai",
        "gemini": "https://gemini.google.com",
        "github": "https://github.com",
        "twitter": "https://x.com",
        "x": "https://x.com",
        "linkedin": "https://www.linkedin.com",
        "reddit": "https://www.reddit.com",
        "youtube": "https://www.youtube.com",
        "netflix": "https://www.netflix.com",
        "amazon": "https://www.amazon.com",
        "flipkart": "https://www.flipkart.com",
        "spotify": "https://open.spotify.com",
        "canva": "https://www.canva.com",
    }
    q_norm = query.lower().strip()
    if q_norm in known:
        url = open_url(known[q_norm])
        return {"result": f"Opened top result for '{query}': {url}", "url": url}

    # Fast scraping via DuckDuckGo HTML for first organic result link
    top_url = None
    try:
        ddg_url = f"https://html.duckduckgo.com/html/?q={quote(query)}"
        req = urllib.request.Request(
            ddg_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            match = re.search(r'href="//duckduckgo\.com/l/\?uddg=([^&"\']+)', html)
            if match:
                from urllib.parse import unquote
                top_url = unquote(match.group(1))
    except Exception:
        pass

    if top_url:
        resolved = open_url(top_url)
        return {"result": f"Found top organic result for '{query}' and opened: {resolved}", "url": resolved}

    # Fallback to Google search
    url = _build_search_url("google", query)
    resolved = open_url(url)
    return {"result": f"Opened Google search for '{query}' at {resolved}.", "url": resolved}


__all__ = [
    "play_youtube_music",
    "search_web",
    "search_youtube",
    "search_google",
    "search_github",
    "search_and_open_first_result",
]
