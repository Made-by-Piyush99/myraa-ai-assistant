# 🌸 MYRAA AI Assistant — Complete Master Installation & Setup Guide

Yeh **MYRAA AI Assistant** ki complete, detailed aur all-in-one step-by-step guide hai. Isme Myraa ko 3 alag-alag devices par install aur setup karne ka pura process detail me bataya gaya hai:

1. **📱 FIRST: Mobile Par (Android & Termux)** — Bina PC ke phone par complete setup.
2. **📺 SECOND: Jio PC & Jio TV Set-Top Box Par** — Living room TV screen, JioPages & TV Remote control setup.
3. **💻 THIRD: Laptop & Desktop PC Par (Windows)** — Setup Installer, Portable EXE, Desktop Automation & Screen Vision.

---

# 📱 PART 1: MOBILE SETUP GUIDE (Android & Termux)

Jab aapke paas PC ya laptop na ho, tab aap apne Android smartphone me Termux ke zariye Myraa ko asani se chala sakte hain.

### ⚠️ Step 1.1: Termux Kahan Se Download Karein (Important)
> **Caution:** Google Play Store par jo Termux app hai wo outdated ho chuka hai aur usme `repository under maintenance` error aata hai.
> Isliye hamesha **F-Droid** se hi official updated Termux download karein.

1. Apne mobile ke Chrome browser me yeh link kholein:  
   👉 **Direct APK Download Link:** [https://f-droid.org/repo/com.termux_1020.apk](https://f-droid.org/repo/com.termux_1020.apk)  
   *(Ya official F-Droid store page: [https://f-droid.org/en/packages/com.termux/](https://f-droid.org/en/packages/com.termux/))*
2. Download complete hone ke baad APK par tap karein aur **Install** karein.
3. Agar phone *"Install from Unknown Sources"* pooche, toh **Allow** par tap karein.

---

### ⚡ Step 1.2: Termux Ko Pehli Baar Khol Kar Setup Karein
1. Mobile me **Termux** app open karein. Ek black terminal screen dikhegi.
2. Storage permission lene ke liye yeh command likhein aur Enter karein:
   ```bash
   termux-setup-storage
   ```
   *(Screen par permission popup aayega — **Allow** par click karein).*

3. Termux ke base packages update karein:
   ```bash
   pkg update -y && pkg upgrade -y
   ```
   *(Agar screen par `[Y/n]` ya `default=N` pooche, toh keyboard se bas `y` likhkar **Enter** dabate jayein).*

> 💡 **Tip (Agar Repository Error Aaye):**  
> Agar kabhi `Repository under maintenance` ka error aaye, toh yeh command run karein:  
> `termux-change-repo` -> Select `OK` -> `Mirrors by Grimler` ya `Cloudflare` select karke `OK` karein.

---

### 📦 Step 1.3: Node.js Aur Git Install Karein
Termux me yeh single command run karein:
```bash
pkg install git nodejs -y
```

Install hone ke baad check karein:
```bash
node -v
git --version
```

---

### 🚀 Step 1.4: GitHub Se Code Download (Clone) Karein
Aapka code GitHub repository par live hai. Termux me yeh command run karein:

```bash
git clone https://github.com/Made-by-Piyush99/myraa-ai-assistant.git
```

Folder ke andar jayein aur dependencies install karein:
```bash
cd myraa-ai-assistant/mobile
npm install
```

---

### 🟢 Step 1.5: Server Start Karein
Termux me yeh command chalayein:
```bash
bash start-termux.sh
# Ya direct: node server.js
```

Screen par yeh message aayega:
```
======================================================
  🌸 MYRAA Mobile Voice Edition
  Local URL (On this Phone):  http://localhost:3000
======================================================
```
Iska matlab aapka mobile server live ho chuka hai!

---

### 🌐 Step 1.6: Mobile Chrome Me Kholen Aur Baatchit Shuru Karein
1. Termux ko band mat karein (sirf phone ka **Home button** dabakar background me chalne dein).
2. Mobile me **Google Chrome** open karein.
3. Address bar me yeh URL type karein:  
   👉 **`http://localhost:3000`**
4. Myraa ka glowing visual interface khul jayega:
   - Top right me **⚙️ Settings** par tap karein:
     - **🔑 API & Test:** Apni Gemini API Key daalein aur **"🧪 Test Connection"** button dabayein. Yeh turant live test karke batayega ki key working hai ya nahi aur connection speed (ms) kitni hai! Fir **💾 Save Key** karein.
     - **🎙️ Voice:** Apni pasandida voice (*Aoede*, *Puck*, *Kore*, *Fenrir*, *Charon*) chunein aur Save karein.
   - **🧠 Memories (Desktop Parity):** Top bar me **🧠 Memories** par click karke aap Myraa ki saari yaadein dekh sakte hain, nayi memory add kar sakte hain ya delete kar sakte hain.
5. **🎙️ Tap to Speak** par click karein:
   - Chrome aapse Microphone ki permission mangega -> **Allow** karein.
6. Ab bolna shuru karein:
   - *"Namaste Myraa, kaisi ho?"*
   - *"Play Believer song on YouTube"* (screen par automatically YouTube mini-player start ho jayega!)
   - *"Yaad rakhna mera naam TECH hai"* (automatically memory me store ho jayega!)

---

### 📲 Step 1.7: Phone Ki Home Screen Par App Shortcut Banayein
1. Chrome me right-top corner ke **3 Dots (⋮)** par tap karein.
2. **"Add to Home screen"** ya **"Install App"** select karein.
3. Ab aapke phone ki screen par Myraa ka direct App icon ban jayega!

---

### 🔋 Step 1.8: Background Battery Optimization Off Karein
1. Phone **Settings** -> **Apps** -> **Termux**.
2. **Battery** par tap karke **"Unrestricted"** (ya "No restrictions") select karein.
3. Ab phone screen lock hone par bhi Termux background me band nahi hoga.

---

### ☀️ Mobile Daily Use (Rozana Kaise Chalayein):
Jab bhi use karna ho:
1. **Termux kholein** aur yeh likhein:
   ```bash
   cd myraa-ai-assistant/mobile && node server.js
   ```
2. Chrome me `http://localhost:3000` kholein aur baat karein!

---
---

# 📺 PART 2: JIO PC & JIO TV SET-TOP BOX SETUP GUIDE

Agar aap apne living room TV (JioFiber Set-Top Box) ya JioPC par Myraa chalana chahte hain:

### 🌟 Jio TV / Jio PC Special Features:
- **10-Foot Big Screen UI**: Bada text aur high-contrast visualizer jo TV par 8–10 feet door se saaf dikhta hai.
- **TV Remote Navigation**: Jio Remote ke D-pad buttons (**▲ Up, ▼ Down, ◀ Left, ▶ Right, OK, Back**) se sabhi buttons par glowing focus hota hai.
- **YouTube TV Hub**: Direct voice command se TV screen par full HD YouTube video aur music autoplay hota hai.
- **JioPages Ready**: Kisi extra software ke bina direct Jio Set-Top Box ke **JioPages** browser par chalta hai.

---

### 🚀 Method 2.1: Home Wi-Fi Se Jio TV Par Chalana (Sabse Easy & Recommended)

Agar aapke ghar me Wi-Fi hai jisse aapka Laptop/PC aur Jio TV dono connected hain:

1. **Laptop/PC Par Server Run Karein:**
   PC terminal me `jiopc` folder me jakar start file chalayein:
   ```cmd
   cd jiopc
   start-jiopc.bat
   ```
   *(Linux/Mac user `bash start-jiopc.sh` chalayein).*

2. **Apne Laptop/PC Ka Local Wi-Fi IP Pata Karein:**
   - Windows me CMD kholein aur `ipconfig` likhein.
   - `IPv4 Address` dekhein (jaise `192.168.1.15`).

3. **Jio TV / Jio Set-Top Box Par Open Karein:**
   - TV on karein aur **JioPages** browser app kholein.
   - Address bar me yeh URL type karein:
     ```
     http://<AAPKA-PC-IP>:3005
     # Example: http://192.168.1.15:3005
     ```
4. **TV Par Use Karein:**
   - TV screen par Myraa ka interface khulega.
   - Remote se **Fullscreen** button par jaakar OK dabayein.
   - Remote ka D-pad use karke **🎙️ Tap to Speak** par OK dabayein aur bolna shuru karein!

---

### 🛠️ Method 2.2: Direct JioPC / Jio STB Standalone (Bina Laptop Ke)

Agar aapke Jio Set-Top Box me Termux sideloaded hai ya aap JioPC (Jio Cloud PC) use kar rahe hain:

1. JioPC terminal ya Jio STB me Termux kholein:
   ```bash
   git clone https://github.com/Made-by-Piyush99/myraa-ai-assistant.git
   cd myraa-ai-assistant/jiopc
   npm install
   bash start-jiopc.sh
   ```
2. JioPages ya browser me direct kholein:
   ```
   http://localhost:3005
   ```
3. Connected USB mic ya remote se baat karein!

---

### 🎵 Jio TV Par Useful Voice Commands:
- *"Arijit Singh ke latest gane chalao"* -> Fullscreen YouTube TV player me gaana shuru ho jayega.
- *"Play Lo-Fi hip hop beats"* -> Background study music TV par bajega.
- *"Bollywood movie trailers dikhao"* -> HD trailer video chal jayegi.
- *"TV Volume up"* / *"Volume down"* -> TV audio adjust karegi.

---
---

# 💻 PART 3: LAPTOP & DESKTOP PC SETUP GUIDE (Windows)

Laptop aur Desktop PC par Myraa ko **Full JARVIS Power** milti hai — jisme **OS Mouse Pointer Control**, **Keyboard Typing**, **Real Google Chrome Automation**, **Screen Vision**, aur **74 System Control Tools** shamil hain.

---

### 📦 Step 3.1: Download Executable Files
Aapko code compile karne ki jarurat nahi hai. Pre-built `.exe` files repo ke [Installation/](Installation/) folder me available hain:

| File Name | Size | Kiske Liye Hai? |
| :--- | :--- | :--- |
| **`MYRAA-Setup-1.0.0.exe`** | ~157 MB | **Recommended Windows Installer**. Install karta hai aur Desktop + Start Menu me shortcuts banata hai. |
| **`MYRAA-Portable-1.0.0.exe`** | ~154 MB | **Standalone Portable**. Bina install kiye direct double-click karke chalta hai (Pendrive se bhi chala sakte hain). |

*(Agar aapne GitHub repo clone kiya hai, toh aap source code se bhi direct `npm start` ya `npm run dev` chala sakte hain).*

---

### ⚡ Step 3.2: Installation Aur First Launch
1. `MYRAA-Setup-1.0.0.exe` par double-click karein.
2. Windows SmartScreen warning aaye toh **More info** par click karke **Run anyway** select karein.
3. Installation complete hone par Myraa automatically launch ho jayegi aur Desktop par **MYRAA** ka icon ban jayega.

---

### 🔑 Step 3.3: First-Time ApiKeyGate Setup
Pehli baar launch hone par **ApiKeyGate** security screen dikhegi:
1. Google AI Studio ([https://aistudio.google.com/](https://aistudio.google.com/)) par jakar free API key generate karein.
2. Myraa ke input box me paste karein aur **Connect Myraa** par click karein.
3. *Note:* Developer ki personal key is build me nahi hai; aapki personal key aapke PC me `%APPDATA%\MYRAA\secrets.json` me locally encrypted rehti hai.

---

### ⚙️ Step 3.4: Settings Me Permissions Enable Karein
Myraa ke top-right me **Settings** icon par click karein aur **Permissions** section check karein:
- ✅ **Desktop OS Control:** Mouse pointer movement, click, typing, volume, aur app launch karne ke liye.
- ✅ **Chrome Automation:** Real Google Chrome me search aur links open karne ke liye.
- ✅ **Screen Vision:** Real-time screen capture aur error reading ke liye.
- ✅ **File System Access:** Files create/read/search karne ke liye.

---

### 🤖 Step 3.5: Laptop/PC Par JARVIS Voice Powers Use Karein:

#### 1. 🖱️ Mouse Pointer Control:
- *"Mouse ko right click karo"* -> Context menu open hoga.
- *"Mouse ko center me le jao aur double click karo"* -> Target open hoga.
- *"Page ko scroll down karo"* -> Smooth scroll karegi.

#### 2. ⌨️ Real Keyboard Typing:
- *"Notepad open karo aur 'Hello Myraa' type karo"* -> Notepad khol kar typing karegi.
- *"Address bar focus karo aur Enter press karo"* -> Keyboard shortcuts chalayegi.

#### 3. 🌐 Web Search & First Link Click:
- *"Google per Suno AI search karo"* -> Real Chrome browser me search page kholegi.
- *"Instagram search karo and first link par click karo"* -> Top search result par click karke direct Instagram open karegi.

#### 4. 🖥️ Real-Time Screen Vision:
- Top bar me **Share Screen** button dabayein.
- Myraa ko puchiye: *"Do you see any errors on my screen?"* ya *"Explain this code on my screen"* -> Screen dekh kar turant explain karegi!

---

### 🛠️ Developer Mode: Source Code Se Chalana (Optional)
Agar aap developers hain aur code modify karke chalana chahte hain:
```bash
# 1. Install Node modules
npm install

# 2. Run frontend & backend in dev mode
npm run dev

# 3. Start Python desktop agent in separate terminal
python -m uvicorn desktop_agent.main:app --port 8765

# 4. Build fresh installer
npm run dist
```

---

## 🎯 Quick Platform Reference Table

| Device | Folder / File | Command / Action | Primary Interface |
| :--- | :--- | :--- | :--- |
| **📱 Mobile (Android)** | `mobile/` | `bash start-termux.sh` -> `http://localhost:3000` | Touch & Voice Mic |
| **📺 Jio TV / Jio PC** | `jiopc/` | `start-jiopc.bat` -> `http://<IP>:3005` in JioPages | TV Remote D-Pad & Voice |
| **💻 Laptop / Desktop PC** | `Installation/` | Run `MYRAA-Setup-1.0.0.exe` | 3D Hologram + 74 OS Tools |
