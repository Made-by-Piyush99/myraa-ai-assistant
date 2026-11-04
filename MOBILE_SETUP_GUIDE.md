# 📱 MYRAA Mobile Edition — Termux Step-by-Step Complete Guide

Is guide me bilkul shuruat se step-by-step bataya gaya hai ki:
- **Termux app kahan se download karna hai**
- **Install karke pehli baar kya commands chalani hain**
- **GitHub se code kaise aayega**
- **Mobile browser me Myraa ko kaise chalana hai**
- **Daily use kaise karna hai**

---

## ⚠️ Sabse Pehle Jaruri Baat (Google Play Store Se Download Na Karein)

> **Important:** Google Play Store par jo Termux hai wo **outdated** hai aur usme package updates fail ho jate hain.
> 
> Hamesha **F-Droid** ya **GitHub Release** se hi Termux download karein. Yeh 100% free, safe aur updated hai.

---

## 📥 STEP 1: Termux App Download Aur Install Karein

1. Apne mobile ke Chrome browser me yeh link kholein:
   👉 **Direct Download Link (F-Droid):** [https://f-droid.org/repo/com.termux_1020.apk](https://f-droid.org/repo/com.termux_1020.apk)  
   *(Ya official F-Droid page par jaakar "Download APK" dabayein: [https://f-droid.org/en/packages/com.termux/](https://f-droid.org/en/packages/com.termux/))*
2. Download complete hone par APK file par tap karke **Install** karein.
3. Agar phone *"Install unknown apps"* ki permission mange, toh **Allow from this source** par tick karein aur install karein.

---

## ⚡ STEP 2: Termux Pehli Baar Open Karein & Setup Karein

1. Apne mobile me **Termux** app open karein. Ek black/green terminal screen dikhegi.
2. Sabse pehle storage permission lene ke liye yeh command likhein aur Enter dabayein:
   ```bash
   termux-setup-storage
   ```
   *(Screen par popup aayega — **Allow** par tap karein).*

3. Ab Termux ke basic tools ko update karein:
   ```bash
   pkg update -y && pkg upgrade -y
   ```
   *(Agar installation ke dauran screen par `[Y/n]` ya `default=N` jaisa sawaal pooche, toh keyboard se bas `y` likhkar **Enter** daba dein).*

> 💡 **Tip (Agar Repository Error aaye):**  
> Agar kabhi `Repository under maintenance` ka error aaye, toh yeh command run karein:  
> `termux-change-repo`  
> Usme pehle option par `OK` dabayein aur `Mirrors by Grimler` ya `Cloudflare` select karke OK kar dein.

---

## 📦 STEP 3: Node.js Aur Git Install Karein

Ab Myraa ko chalane ke liye Node.js aur GitHub se code download karne ke liye Git chahiye.

Termux me yeh single command copy-paste karein aur Enter dabayein:
```bash
pkg install git nodejs -y
```

Install hone ke baad verify karne ke liye yeh check kar sakte hain:
```bash
node -v
git --version
```
Dono ka version number screen par aa jayega.

---

## 🚀 STEP 4: GitHub Se Myraa AI Assistant Download Karein

Aapka code GitHub par live hai. Termux me bas yeh command run karein:

```bash
git clone https://github.com/Made-by-Piyush99/myraa-ai-assistant.git
```

Clone complete hone ke baad mobile folder ke andar jayein:
```bash
cd myraa-ai-assistant/mobile
```

Ab project ke packages install karein:
```bash
npm install
```
*(Yeh kuch seconds me sabhi lightweight packages install kar dega).*

---

## 🟢 STEP 5: Server Start Karein

Ab Myraa ka server start karne ke liye bas yeh run karein:

```bash
bash start-termux.sh
```
*(Ya direct `node server.js` likhkar bhi start kar sakte hain).*

Termux screen par yeh likha hua aa jayega:
```
======================================================
  🌸 MYRAA Mobile Voice Edition
======================================================
  Local URL (On this Phone):  http://localhost:3000
======================================================
```
Iska matlab aapka server mobile par successfully live ho gaya hai!

---

## 🌐 STEP 6: Mobile Chrome Me Open Karein & Baatchit Shuru Karein

1. Termux ko band mat karna (sirf home button daba kar background me rehne dein).
2. Apne mobile me **Google Chrome** open karein.
3. Address bar me yeh URL type karein:
   👉 **`http://localhost:3000`**
4. Screen par Myraa ka visual interface khul jayega:
   - Agar pehli baar khol rahe hain, toh **API Key Prompt** aayega.
   - Apni free Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/) se) paste karke **Save** karein.
5. Ab **🎙️ Tap to Speak** button dabayein:
   - Chrome aapse **Microphone** ki permission mangega -> **Allow** par tap karein.
6. Ab Myraa se Hindi ya English me bolna shuru karein!
   - *"Namaste Myraa, kaisi ho?"*
   - *"Play Believer song on YouTube"*
   - *"Mujhe koi acchi kahani sunao"*

---

## 📲 STEP 7: Phone Ki Home Screen Par App Jaisa Icon Banayein

Baar-baar browser me `http://localhost:3000` type na karna pade:
1. Chrome browser me jab Myraa khuli ho, right-top corner me **3 Dots (⋮)** par click karein.
2. Menu me se **"Add to Home screen"** ya **"Install App"** par click karein.
3. Ab aapke mobile ke home screen par Myraa ka sundar App icon ban jayega!

---

## 🔋 STEP 8: Battery Optimization Off Karein (Taaki Background Me Band Na Ho)

Android phone kabhi-kabhi background apps ko battery bachane ke liye band kar deta hai:
1. Phone ki **Settings** me jayein -> **Apps** -> **Termux**.
2. **Battery** par tap karein aur **"Unrestricted"** (ya "No restrictions / Don't optimize") select karein.
3. Ab screen lock hone par ya background me hone par bhi Myraa bina ruke chalti rahegi!

---

## ☀️ DAILY USE (Rozana Kaise Start Karein — Sirf 2 Seconds)

Jab bhi aapko mobile par Myraa ko dobara chalana ho:
1. **Termux app open karein** aur bas yeh likhkar Enter dabayein:
   ```bash
   cd myraa-ai-assistant/mobile && node server.js
   ```
2. Apne mobile screen par Myraa ke shortcut icon par tap karein aur baatchit shuru karein!
3. Server band karna ho toh Termux me keyboard se `Ctrl + C` dabayein.

---

## 🛠️ Common Problems & Solutions (Troubleshooting)

### Problem 1: `Port 3000 already in use` error
- **Reason:** Puraana server background me chal raha hai.
- **Solution:** Termux me yeh command chalayein:
  ```bash
  killall node
  node server.js
  ```

### Problem 2: Microphone ki aawaz nahi aa rahi
- **Solution:** Chrome ki Site settings me jayein:
  `Settings` -> `Site settings` -> `Microphone` -> `http://localhost:3000` ko **Allow** karein.

### Problem 3: Termux me code update kaise karein (Latest changes pane ke liye)
- Jab bhi GitHub par naya code aaye, Termux me yeh command run karein:
  ```bash
  cd ~/myraa-ai-assistant && git pull
  ```
