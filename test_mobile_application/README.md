# 📱 MYRAA Mobile Application — Autonomous Mobile AI Assistant (APK)

> **Super-Access Native Android Application with Real-Time Voice, Touch Gestures, Floating Screen Overlay, and Full Phone Control.**

---

## 🌟 Overview

**MYRAA Mobile** is a dedicated Android companion application built in its own isolated folder (`mobile_application`). It brings the full holographic cyberpunk anime companion experience from the desktop version to your Android smartphone, combined with **Android Accessibility Services** to autonomously touch, swipe, open apps, read screen elements, and execute voice commands across your entire device.

---

## 🛡️ Super-Access Capabilities & Permissions

| Capability | Android Permission / Service | What It Does |
| :--- | :--- | :--- |
| **Autonomous Touch & Tap** | `MyraaAccessibilityService` (`dispatchGesture`) | Taps buttons, links, or coordinates `(x, y)` on any app. |
| **Autonomous Swipe & Scroll** | `MyraaAccessibilityService` (`dispatchGesture`) | Swipes up, down, left, right, or scrolls feeds (Instagram, YouTube, Reels). |
| **Global Navigation** | `GLOBAL_ACTION_HOME / BACK / RECENTS` | Press Home, Back, Recent Apps, and pull down notification shade. |
| **Text Typing** | `AccessibilityNodeInfo.ACTION_SET_TEXT` | Types messages or searches in focused input boxes. |
| **Screen Reading (Vision)** | `AccessibilityNodeInfo` hierarchy dump | Scans visible text and UI elements from the active screen. |
| **Floating Assistant Bubble** | `SYSTEM_ALERT_WINDOW` (`MyraaOverlayService`) | Stays active over other apps so you can talk to Myraa while using WhatsApp or browsing. |
| **Camera & Flashlight** | `android.permission.CAMERA` + `FLASHLIGHT` | Real-time vision capture and hardware flashlight control. |
| **GPS Location** | `ACCESS_FINE_LOCATION` | Real-time GPS coordinates fetching. |
| **App Management** | `QUERY_ALL_PACKAGES` | Lists installed apps and launches WhatsApp, YouTube, Camera, etc. |
| **Full Duplex Audio** | `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` | Low-latency voice input & loud/earpiece speaker output. |

---

## 🚀 How to Build the APK

### Method 1: Build in Android Studio (Recommended)
1. Open **Android Studio**.
2. Select **Open** and choose the folder: `D:\myraa\MYRAA_\myraa-ai-assistant\mobile_application`.
3. Wait for Gradle sync to complete.
4. Go to **Build** menu > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Once finished, click **locate** to get `app-debug.apk`!

### Method 2: Command Line (Gradle)
If you have Java 17+ installed on your PC:
```bash
cd mobile_application
./gradlew assembleDebug
```
The output APK will be generated at:
`mobile_application/app/build/outputs/apk/debug/app-debug.apk`.

### Method 3: GitHub Actions (Automated Cloud APK Build)
Whenever you push your code to GitHub, the included GitHub Actions workflow will automatically compile the APK and give you a direct download link under your repo's **Actions** tab!

---

## 📲 How to Install & Enable Super-Access on Your Android Phone

1. Transfer `app-debug.apk` to your phone via USB or WhatsApp/Drive and tap **Install**.
2. Open the **MYRAA** app.
3. Tap **Allow** on the camera, microphone, and location permission dialogs.
4. **Grant Accessibility Service (Touch Control):**
   * In the top bar, tap the **⚠️ Enable Access** pill.
   * Your phone will open **Accessibility Settings**.
   * Tap **Installed Apps** / **Downloaded Services** > Select **MYRAA AI Super Access & Touch Control** > Turn it **ON**.
5. **Grant Floating Overlay:**
   * Tap the **🪟 Bubble** button in the top bar.
   * Turn ON **Allow display over other apps**.
6. You're all set! Now tap the center Mic button or say your commands to start controlling your phone with Myraa!

---

## 🔒 Isolation Guarantee
This mobile application is completely standalone inside `mobile_application/`. It has **no dependency or breaking impact** on your Windows PC Assistant, Jio PC, or web backend.
