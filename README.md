# 🌸 MYRAA AI Assistant — Multi-Device AI Voice & Automation Companion

<div align="center">
  <h3>Next-Generation AI Voice Assistant with Real-Time Desktop Automation & Multi-Device Freedom</h3>
  <p><b>Mobile (Termux)</b> • <b>Jio PC & Jio TV Set-Top Box</b> • <b>Windows Laptop & Desktop PC</b></p>
</div>

---

## 🌟 Supported Platforms & Editions

MYRAA is built with a modular, 3-tier architecture so you can run it anywhere without mixing up dependencies:

```
myraa-ai-assistant/
├── mobile/                   # 📱 Mobile Voice Edition (Android, Termux, Cloud)
│   ├── public/
│   ├── server.js
│   ├── start-termux.sh
│   └── README.md
├── jiopc/                    # 📺 Jio PC & Jio TV Set-Top Box Edition (10-Foot Living Room UI)
│   ├── public/
│   ├── server.js
│   ├── start-jiopc.bat
│   ├── start-jiopc.sh
│   └── README.md
├── Installation/             # 💻 Windows Laptop & Desktop Packaged Executables
│   ├── MYRAA-Setup-1.0.0.exe
│   ├── MYRAA-Portable-1.0.0.exe
│   └── SETUP_GUIDE.md
├── desktop_agent/            # 🤖 Python JARVIS Agent (74 OS-level tools)
└── MULTI_DEVICE_SETUP_GUIDE.md # 📖 Comprehensive Multi-Device Guide
```

---

## 📖 Quick Setup by Device (Detailed Guide: [MULTI_DEVICE_SETUP_GUIDE.md](MULTI_DEVICE_SETUP_GUIDE.md))

### 1. 📱 First: Mobile (Android & Termux)
- Install **Node.js** in Termux (`pkg install -y nodejs`).
- Run `cd mobile && npm install && bash start-termux.sh`.
- Open `http://localhost:3000` in mobile Chrome with microphone permissions enabled.

### 2. 📺 Second: Jio PC & Jio TV Set-Top Box
- Start `start-jiopc.bat` (or `start-jiopc.sh`) on port `3005`.
- Open `http://<your-pc-ip>:3005` in the **JioPages** browser on your Jio Set-Top Box or JioPC.
- 10-foot UI with TV Remote D-Pad Navigation and voice-activated YouTube streaming.

### 3. 💻 Third: Laptop & Desktop PC (Windows)
- Run `Installation/MYRAA-Setup-1.0.0.exe` or `MYRAA-Portable-1.0.0.exe`.
- Includes full **74 OS automation tools**:
  - Mouse pointer movement, left/right/double click, scroll, and drag.
  - Full keyboard typing into active windows with Unicode & Hindi support.
  - Real Chrome browser navigation and organic search link clicking.
  - Multi-modal real-time screen vision and OCR screen reading.

---

## 🔒 Security & Privacy
- **Developer Key Shielded**: Personal API keys are strictly excluded from git and binaries.
- **Local Storage**: Every user inputs their own free key from [Google AI Studio](https://aistudio.google.com/), securely persisted locally in encrypted files.
- **Active Permission Governance**: Toggle OS control, Chrome access, File system access, and Screen capture at any time in Settings.
