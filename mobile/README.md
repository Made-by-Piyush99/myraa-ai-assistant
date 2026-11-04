# 🌸 MYRAA Mobile Voice Edition — Termux Step-by-Step Guide

Lightweight, high-performance real-time voice companion designed to run directly on **Android smartphones via Termux** without needing any PC!

---

## 📥 Step 1: Download & Install Termux

> ⚠️ **DO NOT install from Google Play Store** (Play Store version is outdated and broken).

Download the updated Termux APK:
- **Direct APK (F-Droid):** [https://f-droid.org/repo/com.termux_1020.apk](https://f-droid.org/repo/com.termux_1020.apk)
- **F-Droid Store Page:** [https://f-droid.org/en/packages/com.termux/](https://f-droid.org/en/packages/com.termux/)

Tap the downloaded APK and install it (allow "Install from Unknown Sources" if prompted).

---

## ⚡ Step 2: First-Time Setup in Termux

Open the Termux app and run:

```bash
termux-setup-storage
# Tap "Allow" on the permission prompt

pkg update -y && pkg upgrade -y
# If prompted with [Y/n], type 'y' and press Enter

pkg install git nodejs -y
```

---

## 🚀 Step 3: Clone & Install MYRAA

Run these commands in Termux:

```bash
git clone https://github.com/Made-by-Piyush99/myraa-ai-assistant.git
cd myraa-ai-assistant/mobile
npm install
```

---

## 🟢 Step 4: Start the Server

```bash
bash start-termux.sh
# Or run: node server.js
```

You will see:
```
======================================================
  🌸 MYRAA Mobile Voice Edition
  Local URL (On this Phone):  http://localhost:3000
======================================================
```

---

## 🌐 Step 5: Open in Mobile Chrome

1. Keep Termux running in the background.
2. Open **Google Chrome** on your phone.
3. Go to:
   👉 **`http://localhost:3000`**
4. Paste your free Google Gemini API key ([Google AI Studio](https://aistudio.google.com/)).
5. Tap **🎙️ Tap to Speak** and tap **Allow** for microphone access.
6. Talk naturally to Myraa in Hindi or English!

---

## 📱 Pro-Tip: Add to Phone Home Screen
In Chrome, tap the **3 Dots (⋮)** > tap **"Add to Home screen"** or **"Install App"**. An app icon will appear on your phone home screen!

---

## ☀️ Daily Use (Start in 2 Seconds)
When you want to use Myraa again:
```bash
cd myraa-ai-assistant/mobile && node server.js
```
Open `http://localhost:3000` on your phone!
