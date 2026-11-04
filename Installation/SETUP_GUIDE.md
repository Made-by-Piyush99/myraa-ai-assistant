# 🌸 MYRAA Desktop Assistant — Setup & Installation Guide

Welcome to MYRAA Desktop Assistant (V2)!

---

## 📦 What's Inside this Folder:

1. **`MYRAA-Setup-1.0.0.exe`** (Recommended)
   - Standard Windows installer.
   - Installs MYRAA into your user profile.
   - Automatically creates Desktop and Start Menu shortcuts.
   - Includes full uninstaller in Windows Settings.

2. **`MYRAA-Portable-1.0.0.exe`**
   - Single-file standalone executable.
   - Requires NO installation — simply double-click and run!
   - Can be run from a USB drive or any folder.

---

## 🔒 Security & API Key Protection (Developer Key Shielded)

> **Important Security Notice:**
> The developer's personal Google Gemini API key has been completely stripped from these builds.
> 
> **Every user must use their own free Google Gemini API key on first launch.**
> 
> When the app opens for the first time, a secure onboarding screen (**ApiKeyGate**) will appear:
> 1. Get a free API key from Google AI Studio: https://aistudio.google.com/
> 2. Paste your key into the MYRAA onboarding prompt.
> 3. Your key is stored locally on your PC in `%APPDATA%\MYRAA\secrets.json` and is NEVER transmitted to the developer, third parties, or shared with anyone else.

---

## 🎵 Features Included in this Build:
- **Holographic YouTube Hub & In-App Embed Player:**
  - Zero CSP / CORS errors — eliminates sandbox blocks completely!
  - Integrated YouTube Discovery Portal with instant search, category filters (Trending, Bollywood, Lo-Fi, Gaming, Coding & AI), and video cards with thumbnails, channel names, and durations.
  - In-app embed player with autoplay and playback toolbar.
  - Option to toggle playback target to real Google Chrome.
- **YouTube Data API v3 Integration:**
  - Support for official Google YouTube Data API v3 key with live key testing tool in Settings.
  - High-performance scraper fallback ensures YouTube search & playback always works even without an API key!
- **Full Real Google Chrome Browser Access:**
  - Launch real installed Google Chrome with `openChrome`.
  - Search directly inside Google Chrome with `chromeSearch`.
  - Automated browser control drives your real desktop Chrome browser.
- **Active Permission Governance Toggles (Real & Enforced):**
  - **Desktop OS Control:** Toggle permission to control mouse pointer, type text, launch/close apps, control volume, brightness, and power actions.
  - **Google Chrome & Web Automation:** Toggle permission to access Chrome and browser tabs.
  - **Local File System Access:** Toggle permission to create, read, list, and search files.
  - **Screen Vision & Capture:** Toggle permission for real-time screen capture streaming.
- **Full OS Mouse Pointer & Keyboard Control (NEW):**
  - **Mouse Controls:** `mouseMove(x, y)`, `mouseClick(x, y, button, clicks)`, `mouseDoubleClick`, `mouseRightClick`, `mouseScroll(amount, direction)`, `mouseDrag`, `mouseGetPosition`.
  - **Keyboard Controls:** `keyboardType(text)` (types text into active window, with automatic clipboard/paste fallback for unicode, Hindi, and URLs), `keyboardPress(key)` ('enter', 'tab', 'esc', 'space', 'backspace', 'win', arrows), `keyboardHotkey(keys)` (shortcuts like Ctrl+T, Ctrl+W, Alt+F4, Win+D).
- **Direct Search & First Link Clicking (NEW):**
  - **Google Search:** `searchGoogle(query)` ("google per suno ai search karo").
  - **Click First Result:** `searchAndOpenFirstResult(query)` / `desktopBrowserSearchAndClickFirst(query)` ("instagram search karo and first link par click karo").
- **JARVIS Windows PC Control:** 74 automated desktop tools (Mouse, Keyboard, Apps, Volume, Files, OCR Screen Reading, Brightness).
- **Embedded Python Runtime:** Self-contained executable — no separate Python or Node.js installation needed on target machines.
