# 🌸 MYRAA Mobile Voice Edition

Lightweight, high-performance, real-time voice companion designed to run directly on **Android (via Termux)** or deployed free on the cloud (**Render / Railway**), completely independent of your PC.

---

## 📱 Option 1: Run directly on Android via Termux

No PC required. Everything runs locally on your Android phone!

### Step 1: Install Termux & Prerequisites
1. Download **Termux** from [F-Droid](https://f-droid.org/en/packages/com.termux/) (avoid Play Store version as it is outdated).
2. Open Termux and run:
   ```bash
   pkg update && pkg upgrade -y
   pkg install nodejs git -y
   ```

### Step 2: Clone & Launch
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd myraa-ai-assistant/mobile
chmod +x start-termux.sh
./start-termux.sh
```

### Step 3: Open in Chrome
Open Google Chrome on your phone and go to:
👉 **`http://localhost:3000`**

- Tap the center call button.
- Allow microphone permission when prompted (Android Chrome allows mic on `localhost` without HTTPS!).
- Start talking to Myraa!

---

## ☁️ Option 2: Deploy to Free Cloud (Render / Railway)

If you don't even want to keep Termux open in the background, deploy the `mobile/` directory to **Render.com** (Free Web Service):

1. **Build Command:** `npm install`
2. **Start Command:** `node server.js`
3. **Environment Variable:** Set `GEMINI_API_KEY` to your Gemini key.
4. Open the generated HTTPS URL on your phone anywhere, anytime!

---

## ⚙️ Features
- **Zero Bloat:** Pure JavaScript/Node.js. No Python, no Electron, no Playwright.
- **Full-Duplex Gemini Live:** Sub-second response times using `gemini-3.1-flash-live-preview`.
- **Anime Persona:** Sweet, warm companion voice (`Aoede`).
- **60fps Canvas Visualizer:** Fluid particle orb that reacts dynamically to voice frequencies.
- **Screen Wake Lock:** Prevents phone screen from turning off while on call.
