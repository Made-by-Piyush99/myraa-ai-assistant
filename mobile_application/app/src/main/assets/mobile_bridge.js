/**
 * MYRAA Mobile Native Bridge Adapter
 * Safely wraps Android Java methods exposed via @JavascriptInterface `window.MyraaNative`.
 */
window.MobileBridge = {
  isAndroid: function() {
    return typeof window.MyraaNative !== 'undefined';
  },

  isAccessibilityActive: function() {
    if (this.isAndroid()) {
      try {
        return window.MyraaNative.isAccessibilityActive();
      } catch (e) {
        console.error('isAccessibilityActive failed:', e);
      }
    }
    return false;
  },

  openAccessibilitySettings: function() {
    if (this.isAndroid()) {
      window.MyraaNative.openAccessibilitySettings();
    } else {
      alert("Accessibility is only available when running on an Android device.");
    }
  },

  isOverlayActive: function() {
    if (this.isAndroid()) {
      try {
        return window.MyraaNative.isOverlayActive();
      } catch (e) {
        console.error('isOverlayActive failed:', e);
      }
    }
    return false;
  },

  openOverlaySettings: function() {
    if (this.isAndroid()) {
      window.MyraaNative.openOverlaySettings();
    } else {
      alert("Overlay permission is only available on Android.");
    }
  },

  testGeminiApiKey: function(apiKey) {
    if (this.isAndroid() && typeof window.MyraaNative.testGeminiApiKey === 'function') {
      try {
        var resStr = window.MyraaNative.testGeminiApiKey(apiKey);
        return JSON.parse(resStr);
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
    return null;
  },

  callGeminiNative: function(model, apiKey, payload) {
    if (this.isAndroid() && typeof window.MyraaNative.callGeminiNative === 'function') {
      try {
        var resStr = window.MyraaNative.callGeminiNative(model, apiKey, typeof payload === 'string' ? payload : JSON.stringify(payload));
        return JSON.parse(resStr);
      } catch (e) {
        return { error: { message: e.message } };
      }
    }
    return null;
  },

  startFloatingBubble: function() {
    if (this.isAndroid()) {
      window.MyraaNative.startFloatingBubble();
    }
  },

  stopFloatingBubble: function() {
    if (this.isAndroid()) {
      window.MyraaNative.stopFloatingBubble();
    }
  },

  // Super Touch & Navigation Actions
  tap: function(x, y) {
    if (this.isAndroid()) {
      return window.MyraaNative.tap(x, y);
    }
    console.log('[Dev Mock] Tap at', x, y);
    return true;
  },

  swipe: function(x1, y1, x2, y2, durationMs) {
    if (this.isAndroid()) {
      return window.MyraaNative.swipe(x1, y1, x2, y2, durationMs || 300);
    }
    console.log('[Dev Mock] Swipe from', x1, y1, 'to', x2, y2);
    return true;
  },

  pressHome: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.pressHome();
    }
    console.log('[Dev Mock] Press Home');
    return true;
  },

  pressBack: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.pressBack();
    }
    console.log('[Dev Mock] Press Back');
    return true;
  },

  pressRecents: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.pressRecents();
    }
    console.log('[Dev Mock] Press Recents');
    return true;
  },

  pullNotifications: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.pullNotifications();
    }
    console.log('[Dev Mock] Pull Notifications');
    return true;
  },

  typeText: function(text) {
    if (this.isAndroid()) {
      return window.MyraaNative.typeText(text);
    }
    console.log('[Dev Mock] Type Text:', text);
    return true;
  },

  clickByText: function(text) {
    if (this.isAndroid()) {
      return window.MyraaNative.clickByText(text);
    }
    console.log('[Dev Mock] Click text:', text);
    return true;
  },

  takeScreenshot: function() {
    if (this.isAndroid() && typeof window.MyraaNative.takeScreenshot === 'function') {
      return window.MyraaNative.takeScreenshot();
    }
    console.log('[Dev Mock] Take Screenshot');
    return true;
  },

  lockScreen: function() {
    if (this.isAndroid() && typeof window.MyraaNative.lockScreen === 'function') {
      return window.MyraaNative.lockScreen();
    }
    console.log('[Dev Mock] Lock Screen');
    return true;
  },

  getServerInfo: function() {
    if (this.isAndroid() && typeof window.MyraaNative.getServerInfo === 'function') {
      try {
        return JSON.parse(window.MyraaNative.getServerInfo());
      } catch (e) {}
    }
    return { running: true, port: 3002, ip: "127.0.0.1", localUrl: "http://localhost:3002", wifiUrl: "http://127.0.0.1:3002" };
  },

  dumpScreenText: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.dumpScreenText();
    }
    return "Mock Screen Content: WhatsApp, Messages, YouTube";
  },

  sendWhatsApp: function(contactOrNumber, message) {
    if (this.isAndroid() && typeof window.MyraaNative.sendWhatsApp === 'function') {
      return window.MyraaNative.sendWhatsApp(contactOrNumber, message);
    }
    console.log('[Dev Mock] Send WhatsApp to', contactOrNumber, ':', message);
    return true;
  },

  openApp: function(nameOrPackage) {
    if (this.isAndroid()) {
      return window.MyraaNative.openApp(nameOrPackage);
    }
    console.log('[Dev Mock] Open App:', nameOrPackage);
    return true;
  },

  getLocation: function() {
    if (this.isAndroid()) {
      try {
        return JSON.parse(window.MyraaNative.getLocation());
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true, latitude: 28.6139, longitude: 77.2090, accuracy: 10 };
  },

  setFlashlight: function(enable) {
    if (this.isAndroid()) {
      return window.MyraaNative.setFlashlight(enable);
    }
    console.log('[Dev Mock] Torch:', enable);
    return true;
  },

  setVolume: function(percent) {
    if (this.isAndroid()) {
      return window.MyraaNative.setVolume(percent);
    }
    console.log('[Dev Mock] Volume:', percent);
    return true;
  },

  getBattery: function() {
    if (this.isAndroid()) {
      try {
        return JSON.parse(window.MyraaNative.getBattery());
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true, level: 85, isCharging: false };
  },

  vibrate: function(durationMs) {
    if (this.isAndroid()) {
      window.MyraaNative.vibrate(durationMs || 100);
    }
  },

  speak: function(text, pitch, rate) {
    var p = parseFloat(pitch || localStorage.getItem('MYRAA_VOICE_PITCH') || '1.25');
    var s = parseFloat(rate || localStorage.getItem('MYRAA_VOICE_SPEED') || '1.0');
    var engine = localStorage.getItem('MYRAA_VOICE_ENGINE') || 'enhanced';

    // 1. ElevenLabs Studio AI Voice
    var elevenKey = localStorage.getItem('MYRAA_ELEVEN_KEY');
    var elevenVoice = localStorage.getItem('MYRAA_ELEVEN_VOICE') || '21m00Tcm4TlvDq8ikWAM';
    if (engine === 'elevenlabs' && elevenKey && elevenKey.trim().length > 10) {
      this.speakElevenLabs(text, elevenKey.trim(), elevenVoice.trim());
      return;
    }

    // 2. Enhanced Sweet Companion: Uses Web Speech Synthesis if browser has neural voice, else Android native
    if (engine === 'web_speech' && 'speechSynthesis' in window) {
      this.speakWebSpeech(text, p, s);
      return;
    }

    // 3. Android Native TTS
    if (this.isAndroid() && typeof window.MyraaNative.speak === 'function') {
      try {
        if (typeof window.MyraaNative.setVoiceSettings === 'function') {
          window.MyraaNative.setVoiceSettings(p, s);
        }
        window.MyraaNative.speak(text);
        return;
      } catch (e) {
        console.warn('Native TTS error:', e);
      }
    }

    // Fallback
    this.speakWebSpeech(text, p, s);
  },

  speakWebSpeech: function(text, pitch, rate) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch || 1.25;
      u.rate = rate || 1.0;
      u.lang = 'hi-IN';

      var voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        var chosen = null;
        for (var i = 0; i < voices.length; i++) {
          var v = voices[i];
          var name = (v.name || '').toLowerCase();
          var lang = (v.lang || '').toLowerCase();
          if ((lang.includes('hi') || lang.includes('in') || lang.includes('en')) &&
              (name.includes('female') || name.includes('girl') || name.includes('natural') || name.includes('google') || name.includes('zira'))) {
            chosen = v;
            break;
          }
        }
        if (chosen) u.voice = chosen;
      }
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('WebSpeech error:', e);
    }
  },

  speakElevenLabs: async function(text, apiKey, voiceId) {
    try {
      if (window.myraaCurrentAudio) {
        try { window.myraaCurrentAudio.pause(); } catch (e) {}
        window.myraaCurrentAudio = null;
      }
      var res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8
          }
        })
      });
      if (res.ok) {
        var blob = await res.blob();
        var url = URL.createObjectURL(blob);
        var audio = new Audio(url);
        window.myraaCurrentAudio = audio;
        audio.play().catch(function() {});
        return;
      }
    } catch (e) {
      console.warn('ElevenLabs API notice:', e);
    }
    // Fallback to local
    this.speakWebSpeech(text, 1.25, 1.0);
  },

  setVoiceSettings: function(pitch, rate) {
    if (this.isAndroid() && typeof window.MyraaNative.setVoiceSettings === 'function') {
      try {
        window.MyraaNative.setVoiceSettings(pitch, rate);
      } catch (e) {}
    }
  },

  openTtsSettings: function() {
    if (this.isAndroid() && typeof window.MyraaNative.openTtsSettings === 'function') {
      try {
        window.MyraaNative.openTtsSettings();
        return;
      } catch (e) {}
    }
    alert("Please open your phone Settings > Accessibility / System > Text-to-Speech.");
  },

  stopSpeaking: function() {
    if (window.myraaCurrentAudio) {
      try { window.myraaCurrentAudio.pause(); } catch (e) {}
      window.myraaCurrentAudio = null;
    }
    if (this.isAndroid() && typeof window.MyraaNative.stopSpeaking === 'function') {
      try {
        window.MyraaNative.stopSpeaking();
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  },

  executeMobileTool: function(toolName, args) {
    if (this.isAndroid()) {
      try {
        var resStr = window.MyraaNative.executeMobileTool(toolName, JSON.stringify(args || {}));
        return JSON.parse(resStr);
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    console.log('[Dev Mock] Execute mobile tool:', toolName, args);
    return { success: true, result: "Executed " + toolName + " (Dev Mock)" };
  }
};
