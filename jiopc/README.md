# 📺 MYRAA — Jio PC & Jio TV Set-Top Box Edition

Welcome to **MYRAA Jio PC & Jio TV Edition**!

This edition is specifically crafted for **JioPC**, **JioFiber Set-Top Boxes (STB)**, and **Android Smart TVs**, providing a seamless 10-foot living room experience.

---

## 🌟 Key Features for Jio PC & Jio TV

1. **10-Foot Living Room TV Interface:**
   - Extra-large high-contrast text and glowing holographic elements visible from 8–10 feet away on any TV.
   - Built-in full-screen mode to remove browser address bars (`F11` or on-screen button).

2. **Jio TV Remote D-Pad Navigation:**
   - Full support for TV remote arrow buttons (**▲ Up**, **▼ Down**, **◀ Left**, **▶ Right**, **OK/Enter**, **Back**).
   - High-visibility glowing focus rings highlight active buttons on your TV.
   - Compatible with wireless mouse and keyboards connected to your Jio Set-Top Box.

3. **YouTube TV Media Hub:**
   - Instant voice-controlled YouTube music and video playback on your TV.
   - Speak *"Arijit Singh ke gane chalao"* or *"Play Lo-Fi Music"* to stream directly on your TV screen.
   - Fast category chips for Trending Bollywood, Lo-Fi, Movie Trailers, Comedy, and Tech News.

4. **Zero-Heavy Native Dependencies:**
   - Pure web application powered by lightweight Node.js.
   - No Python or Electron compilation needed on the TV box.
   - Direct compatibility with the **JioPages** browser pre-installed on every Jio Set-Top Box.

---

## 🚀 How to Run & Use on Jio PC / Jio TV

### Option A: Open directly on TV via Local Wi-Fi (Easiest)
1. Start the server on your Laptop or PC on the same home Wi-Fi network:
   ```cmd
   cd jiopc
   start-jiopc.bat
   ```
2. Note your laptop's local IP address (e.g., `192.168.1.5`).
3. Turn on your **Jio Set-Top Box** or **JioPC** and open the **JioPages** browser app.
4. Type in the address bar:
   ```
   http://192.168.1.5:3005
   ```
5. Press `Fullscreen` and start talking to Myraa with your TV remote or microphone!

---

### Option B: Run Directly on Jio Set-Top Box / JioPC (Standalone)
If your Jio Set-Top Box has Termux installed or you are using JioPC:
1. Open terminal on your JioPC / Termux on Jio STB.
2. Run:
   ```bash
   cd jiopc
   bash start-jiopc.sh
   ```
3. Open `http://localhost:3005` in JioPages or Chrome on the JioPC!
