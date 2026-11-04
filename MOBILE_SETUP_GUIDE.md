# 📱 MYRAA Mobile Voice Edition — Complete Step-by-Step Guide

> **Is guide me seekhenge:** Apne Android mobile par Termux ke zariye MYRAA se bina PC ke direct Voice Call / Baatchit kaise karein.

---

## 📑 Contents
1. [Jaruri Cheezein (Prerequisites)](#1-jaruri-cheezein-prerequisites)
2. [Step 1: Code ko GitHub par Push karein (PC par)](#step-1-code-ko-github-par-push-karein-pc-par)
3. [Step 2: Mobile me Termux Install & Setup karein](#step-2-mobile-me-termux-install--setup-karein)
4. [Step 3: GitHub se Code Clone karein & Start karein](#step-3-github-se-code-clone-karein--start-karein)
5. [Step 4: Chrome me Open karein & Mic Allow karein](#step-4-chrome-me-open-karein--mic-allow-karein)
6. [Step 5: Apni Gemini API Key dalein](#step-5-apni-gemini-api-key-dalein)
7. [Step 6: Phone ke Home Screen par App Icon banayein](#step-6-phone-ke-home-screen-par-app-icon-banayein)
8. [Daily Use (Rozana Kaise Start Karein)](#daily-use-rozana-kaise-start-karein)
9. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## 1. Jaruri Cheezein (Prerequisites)
- Ek **Android Mobile**.
- **Termux App** (Play Store wala outdated hai, isliye **F-Droid** se download karein):  
  👉 [Termux on F-Droid Download Link](https://f-droid.org/en/packages/com.termux/)
- Ek free **Google Gemini API Key**:  
  👉 [Google AI Studio](https://aistudio.google.com/) se free me milti hai.

---

## Step 1: Code ko GitHub par Push karein (PC par)

Agar aapne abhi tak yeh project apne GitHub account par push nahi kiya hai, toh PC ke terminal me yeh commands chalayein:

```bash
# Project root directory me:
git init
git add .
git commit -m "Add Mobile Voice Edition and Desktop fixes"
git branch -M main
git remote add origin https://github.com/AAPKA_USERNAME/AAPKA_REPO_NAME.git
git push -u origin main
```

---

## Step 2: Mobile me Termux Install & Setup karein

1. Apne phone me **Termux** app open karein.
2. Pehli baar Termux me jaruri tools install karne ke liye yeh command copy-paste karein:

```bash
pkg update -y && pkg upgrade -y
pkg install nodejs git -y
```

*(Agar prompt me `[Y/n]` aaye, toh `y` likhkar Enter dabayein).*

---

## Step 3: GitHub se Code Clone karein & Start karein

Termux me apna GitHub repo clone karein aur mobile folder me jayein:

```bash
# 1. Repo clone karein
git clone https://github.com/AAPKA_USERNAME/AAPKA_REPO_NAME.git

# 2. Mobile folder me jayein
cd AAPKA_REPO_NAME/mobile

# 3. Termux script ko executable banayein aur start karein
chmod +x start-termux.sh
./start-termux.sh
```

> **Note:** Pehli baar yeh script 10-15 second legi jaruri light packages install karne me, phir terminal me likha aayega:  
> `🌸 MYRAA Mobile Voice Edition is Ready! 🌸`  
> `Local URL : http://localhost:3000`

---

## Step 4: Chrome me Open karein & Mic Allow karein

1. Apne phone ka **Google Chrome** browser kholein.
2. Address bar me yeh type karein:
   ```
   http://localhost:3000
   ```
3. Screen par **Myraa ka glowing orb aur voice screen** dikhegi.
4. Center ke **Calling / Mic Button** par tap karein.
5. Chrome aapse **Microphone Permission** mangega -> **"Allow"** select karein.

> [!NOTE]
> Android Chrome me `http://localhost:3000` secure origin mana jata hai, isliye **Microphone direct chalega** (kisi tunnel ya HTTPS ki zaroorat nahi padegi).

---

## Step 5: Apni Gemini API Key dalein

1. Screen ke top-right corner me **Settings Icon (⚙️)** par tap karein.
2. Apni **Google Gemini API Key** paste karein.
3. **"Save Key"** button par tap karein.
4. Yeh key aapke phone me securely save ho jayegi (baar-baar dalne ki zaroorat nahi padegi).

---

## Step 6: Phone ke Home Screen par App Icon banayein

Baar-baar Chrome me URL na likhna pade, isliye iska shortcut bana lein:

1. Chrome me top-right me **3 dots (⋮)** par tap karein.
2. **"Add to Home screen"** (ya **"Install app"**) par tap karein.
3. Name me **"MYRAA"** rakhein aur Add karein.
4. Ab aapke phone ki home screen par Myraa ka direct App icon ban jayega!

---

## Daily Use (Rozana Kaise Start Karein)

Jab bhi Myraa se baat karni ho:

1. **Termux app open karein** aur likhein:
   ```bash
   cd AAPKA_REPO_NAME/mobile
   node server.js
   ```
2. Home screen par bane **Myraa App icon** par tap karein.
3. Center button dabayein aur voice baatein shuru karein!
4. Baatchit khatam hone par Termux me `Ctrl + C` dabakar server stop kar sakte hain.

---

## 🌟 Alternate (Bina Termux ke - Free Cloud Hosting)

Agar aap phone me Termux bhi open nahi rakhna chahte aur chahte hain ki Myraa **24/7 bina kisi app ke online rahe**:

1. [Render.com](https://render.com/) par free account banayein.
2. **"New Web Service"** -> apna GitHub repo select karein.
3. Settings:
   - **Root Directory:** `mobile`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variable:** `GEMINI_API_KEY` = your_api_key
4. Render aapko ek permanent free link dega: `https://myraa-tech.onrender.com`.
5. Is link ko phone me bookmark kar lo, jab marzi tap karke baat karo!

---

## Troubleshooting & FAQs

- **Q: Termux me `git clone` karne par permission mangta hai?**  
  A: Agar private repo hai toh GitHub Personal Access Token (PAT) use karein ya repo ko public rakhein (ensure karein ki `.env` me key na ho).
- **Q: Chrome me mic sound nahi aa rahi?**  
  A: Phone ka Media Volume badhayein aur Chrome site settings me jakar Microphone permission "Allowed" check karein.
- **Q: Screen band hone par Termux close ho jata hai?**  
  A: Termux notification bar me swipe down karein aur **"Acquire Wakelock"** par tap karein taaki background me process alive rahe.
