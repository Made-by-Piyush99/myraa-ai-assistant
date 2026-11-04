# 🌸 MYRAA AI Assistant — Multi-Device Complete Setup Guide

Yeh complete setup guide hai jisme step-by-step bataya gaya hai ki **MYRAA AI Assistant** ko:
1. **First: 📱 Mobile Pe (Android / Termux)**
2. **Second: 📺 Jio PC & Jio TV Set-Top Box Par**
3. **Third: 💻 Laptop & Desktop PC Par**

kaise install karein aur use karein.

---

## 📱 PART 1: MOBILE SETUP (Android / Termux)

Jab aapke paas PC na ho aur aap apne smartphone se Myraa ke sath real-time voice chat aur YouTube streaming karna chahte ho:

### Requirement:
- Android phone with **Termux** app installed (F-Droid ya GitHub release se Termux download karein).
- Internet connection (Wi-Fi ya 4G/5G).
- Free Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/)).

### Step-by-Step Installation:

1. **Termux Open Karein aur Packages Install Karein:**
   Termux app open karke yeh command chalayein:
   ```bash
   pkg update -y && pkg install -y git nodejs
   ```

2. **Project Folder Me Jayein:**
   ```bash
   cd myraa-ai-assistant/mobile
   ```

3. **Dependencies Install Karein:**
   ```bash
   npm install
   ```

4. **Server Start Karein:**
   ```bash
   bash start-termux.sh
   ```
   *(Ya direct `node server.js`)*

5. **Mobile Browser Me Open Karein:**
   - Apne mobile Chrome browser me yeh address type karein:
     ```
     http://localhost:3000
     ```
   - Onboarding screen par apni Gemini API Key daalein (yeh key aapke mobile me locally save hoti hai).
   - Microphone permission **Allow** karein.
   - **🎙️ Tap to Speak** par click karein aur Myraa se bolna shuru karein!

---

## 📺 PART 2: JIO PC & JIO TV SET-TOP BOX SETUP

Agar aap apne living room TV (JioFiber Set-Top Box) ya JioPC par Myraa ko chalana chahte hain:

### Features on Jio TV / Jio PC:
- **10-Foot Big Screen UI**: Bada text aur glowing interface jo TV screen par 8–10 feet doori se saaf dikhta hai.
- **TV Remote Navigation**: Jio TV Remote ke arrow buttons (▲ ▼ ◀ ▶, OK/Enter, Back) se button select kar sakte hain.
- **YouTube TV Hub**: Bolte hi TV screen par HD video aur music playback shuru ho jata hai.
- **JioPages Browser Ready**: Kisi bhi extra plugin ke bina direct JioPages par chalta hai.

### Method A: Local Wi-Fi se Jio TV Par Chalana (Sabse Easy)
1. Apne laptop ya PC par server run karein:
   ```cmd
   cd jiopc
   start-jiopc.bat
   ```
2. Apne PC ka Local Wi-Fi IP check karein (jaise `192.168.1.10`).
3. Apne **Jio Set-Top Box** ya **JioPC** ko on karein aur **JioPages** browser open karein.
4. Address bar me yeh URL daalein:
   ```
   http://<YOUR-PC-IP>:3005
   # Example: http://192.168.1.10:3005
   ```
5. **Fullscreen** button dabayein.
6. TV Remote ka OK button daba kar mic on karein ya TV par connected USB mic/keyboard se Myraa ko command dein!

### Method B: Direct JioPC / Jio STB Standalone
1. JioPC terminal ya Jio STB par Termux me jayein:
   ```bash
   cd jiopc
   bash start-jiopc.sh
   ```
2. Browser me `http://localhost:3005` kholein.

---

## 💻 PART 3: LAPTOP & DESKTOP PC SETUP (Windows)

Laptop aur desktop PC par Myraa ko **Full JARVIS Desktop Automation Power** milti hai (Mouse control, keyboard typing, real Chrome automation, screen sharing vision, YouTube music, aur 74 OS tools).

### Files Available in `Installation/` Folder:
1. **`MYRAA-Setup-1.0.0.exe`** (Recommended Windows Installer)
   - Setup run karein, yeh automatic install karke Desktop aur Start Menu me shortcut bana deta hai.
2. **`MYRAA-Portable-1.0.0.exe`** (Standalone Portable)
   - Double-click karein aur bina kisi installation ke direct run karein (USB drive se bhi run kar sakte hain).

### Setup Steps:
1. `Installation/MYRAA-Setup-1.0.0.exe` par double-click karein.
2. App start hone par **ApiKeyGate** screen aayegi:
   - Apni Google Gemini API Key enter karein.
   - Developer key shielded hai; aapki personal key locally encrypt hokar `%APPDATA%\MYRAA\secrets.json` me store hoti hai.
3. **Permissions Settings:**
   - **Settings > Permissions** me jakar check karein:
     - ✅ **Desktop OS Control** (Mouse pointer move/click, typing, volume, apps).
     - ✅ **Chrome Automation** (Real Chrome browser search and navigation).
     - ✅ **Screen Vision** (Real-time screen share analyze karne ke liye).
4. **Commands Aap Bol Sakte Hain:**
   - *"Google per Suno AI search karo"* -> Real browser me search kholegi.
   - *"Instagram search karo and first link par click karo"* -> Top result click karke direct Instagram open karegi.
   - *"Mouse ko right click karo"* / *"Scroll down karo"* -> Direct desktop mouse control.
   - *"Notepad kholo aur typing karo"* -> Real keyboard typing.
   - *"Play Believer song on YouTube"* -> In-app player ya real Chrome me instant autoplay.

---

## 📊 Summary Comparison

| Feature | 📱 Mobile (Termux) | 📺 Jio PC / Jio TV | 💻 Laptop & PC |
| :--- | :--- | :--- | :--- |
| **Interface** | Responsive Mobile Web | 10-Foot TV UI + Remote Focus | 3D Holographic Electron Desktop |
| **Input Methods** | Touch + Phone Mic | TV Remote D-Pad + USB Mic/Keys | Mouse + Keyboard + Full OS Tools |
| **YouTube Media** | Mobile Player | Fullscreen YouTube TV Hub | In-App Embed + Real Google Chrome |
| **Desktop Automation** | N/A | N/A | Full 74 Win32 / Playwright Tools |
| **Running Mode** | Node.js in Termux | JioPages / Web on Port 3005 | Native Windows .exe installer |
