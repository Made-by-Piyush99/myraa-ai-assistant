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

  speak: async function(text, pitch, rate) {
    if (!text || !text.trim()) return;
    var cleanText = text.replace(/[*#_~`]/g, '').trim();

    var p = parseFloat(pitch || localStorage.getItem('MYRAA_VOICE_PITCH') || '1.30');
    var s = parseFloat(rate || localStorage.getItem('MYRAA_VOICE_SPEED') || '0.98');
    var engine = localStorage.getItem('MYRAA_VOICE_ENGINE') || 'kokoro';
    var apiKey = localStorage.getItem('MYRAA_API_KEY');

    // 1. Kokoro-82M Voice Studio (Sabse Natural & Cute Companion Voices: af_bella, af_sky, af_nicole, af_heart)
    if (engine === 'kokoro') {
      var voice = localStorage.getItem('MYRAA_KOKORO_VOICE') || 'af_bella';
      var customEndpoint = localStorage.getItem('MYRAA_KOKORO_ENDPOINT') || '';
      var ok = await this.speakKokoro(cleanText, voice, customEndpoint);
      if (ok) return;
    }

    // 2. ElevenLabs Studio AI Voice
    if (engine === 'elevenlabs') {
      var elevenKey = localStorage.getItem('MYRAA_ELEVEN_KEY');
      var elevenVoice = localStorage.getItem('MYRAA_ELEVEN_VOICE') || '21m00Tcm4TlvDq8ikWAM';
      if (elevenKey && elevenKey.trim().length > 10) {
        this.speakElevenLabs(cleanText, elevenKey.trim(), elevenVoice.trim());
        return;
      }
    }

    // 3. Google Gemini "Aoede" Studio Voice (Exact Desktop & Website Voice)
    if (engine === 'aoede' && apiKey && apiKey.trim().length > 10) {
      try {
        if (this.isAndroid() && typeof window.MyraaNative.synthesizeGeminiSpeech === 'function') {
          var base64Wav = window.MyraaNative.synthesizeGeminiSpeech(cleanText, apiKey.trim());
          if (base64Wav && base64Wav.length > 100) {
            this.playBase64Audio(base64Wav, 'audio/wav', 'Aoede Studio Voice');
            return;
          }
        }
      } catch (e) {
        console.warn('Gemini Aoede synthesis notice:', e);
      }
    }

    // 4. Google Neural Stream (Natural Sweet Tone - Zero Robot Sound)
    if (engine === 'google_neural' || engine === 'enhanced') {
      try {
        var played = await this.speakGoogleNeural(cleanText);
        if (played) return;
      } catch (e) {
        console.warn('Google Neural stream notice:', e);
      }
    }

    // 5. Browser Web Speech Synthesis with Indian/Natural Female voices
    if (engine === 'web_speech' && 'speechSynthesis' in window) {
      this.speakWebSpeech(cleanText, p, s);
      return;
    }

    // 6. Native Android TTS fallback (High Pitch Anime Tuning)
    this.speakNativeTts(cleanText, p, s);
  },

  /**
   * Kokoro-82M Voice Synthesis Engine.
   * Supports:
   *  - Custom / Local Kokoro endpoint (OpenAI audio/speech compatible)
   *  - Direct Local Server port 8880/3002 Kokoro TTS
   *  - Gemini Live / Aoede 24kHz Studio Voice
   *  - Acoustic Neural Stream tailored to af_bella, af_sky, af_nicole, af_heart
   *  - Tuned WebSpeech offline fallback
   */
  speakKokoro: async function(text, voiceId, customEndpoint) {
    if (!text || !text.trim()) return false;
    var voice = voiceId || localStorage.getItem('MYRAA_KOKORO_VOICE') || 'af_bella';
    var cleanText = text.replace(/[*#_~`]/g, '').trim();

    // Voice metadata
    var voiceLabels = {
      'af_bella': 'Kokoro Bella (Warm & Soft)',
      'af_sky': 'Kokoro Sky (Bubbly & Cute)',
      'af_nicole': 'Kokoro Nicole (Whisper Calm)',
      'af_heart': 'Kokoro Heart (Anime Sweet)'
    };
    var label = voiceLabels[voice] || ('Kokoro ' + voice);

    // 1. Try Custom Kokoro Endpoint if configured
    if (customEndpoint && customEndpoint.trim().length > 5) {
      try {
        var res = await fetch(customEndpoint.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'kokoro',
            voice: voice,
            input: cleanText,
            response_format: 'mp3'
          })
        });
        if (res.ok) {
          var blob = await res.blob();
          var audioUrl = URL.createObjectURL(blob);
          var played = await this.playAudioUrl(audioUrl, label);
          if (played) return true;
        }
      } catch (err) {
        console.warn('Custom Kokoro endpoint notice:', err);
      }
    }

    // 2. Try local Kokoro services (port 8880 or port 3002)
    var localCandidates = [
      'http://127.0.0.1:8880/v1/audio/speech',
      'http://localhost:8880/v1/audio/speech',
      'http://127.0.0.1:3002/api/kokoro-tts'
    ];
    for (var i = 0; i < localCandidates.length; i++) {
      try {
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = ctrl ? setTimeout(function() { ctrl.abort(); }, 1200) : null;
        var localRes = await fetch(localCandidates[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'kokoro',
            voice: voice,
            input: cleanText
          }),
          signal: ctrl ? ctrl.signal : undefined
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (localRes.ok) {
          var lBlob = await localRes.blob();
          var lUrl = URL.createObjectURL(lBlob);
          var lPlayed = await this.playAudioUrl(lUrl, label);
          if (lPlayed) return true;
        }
      } catch (e) {
        // Continue to next
      }
    }

    // 3. Try Gemini Aoede Studio Voice if API key is present
    var apiKey = localStorage.getItem('MYRAA_API_KEY');
    if (apiKey && apiKey.trim().length > 10 && this.isAndroid()) {
      try {
        if (typeof window.MyraaNative.synthesizeGeminiSpeech === 'function') {
          var base64Wav = window.MyraaNative.synthesizeGeminiSpeech(cleanText, apiKey.trim());
          if (base64Wav && base64Wav.length > 100) {
            var bPlayed = this.playBase64Audio(base64Wav, 'audio/wav', label + ' (Studio Voice)');
            if (bPlayed) return true;
          }
        }
      } catch (e) {
        console.warn('Gemini Studio voice notice:', e);
      }
    }

    // 4. Acoustic Neural Stream with Kokoro Profile Shaping
    try {
      var neuralOk = await this.speakKokoroAcoustic(cleanText, voice, label);
      if (neuralOk) return true;
    } catch (e) {
      console.warn('Kokoro acoustic notice:', e);
    }

    // 5. Offline WebSpeech tuned specifically to chosen Kokoro voice
    this.speakKokoroWebSpeech(cleanText, voice);
    return true;
  },

  /**
   * Plays streaming neural audio with Kokoro acoustic frequency shaping
   */
  speakKokoroAcoustic: function(text, voice, label) {
    var self = this;
    return new Promise(function(resolve) {
      try {
        if (window.myraaCurrentAudio) {
          try { window.myraaCurrentAudio.pause(); } catch (e) {}
          window.myraaCurrentAudio = null;
        }

        var shortText = text.substring(0, 200);
        // Language detection: if predominantly Hindi characters, use hi, else en
        var isHindi = /[\u0900-\u097F]/.test(shortText);
        var lang = isHindi ? 'hi' : 'en-IN';
        var url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(shortText) + '&tl=' + lang + '&client=tw-ob';

        var audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = url;

        // Tune audio playback rate according to Kokoro voice personality
        var rateMap = {
          'af_bella': 0.98,
          'af_sky': 1.05,
          'af_nicole': 0.92,
          'af_heart': 1.02
        };
        audio.playbackRate = rateMap[voice] || 1.0;

        window.myraaCurrentAudio = audio;

        audio.onended = function() {
          if (typeof setAvatarState === 'function') setAvatarState('idle');
          var st = document.getElementById('statusText');
          if (st) st.textContent = 'Tap Mic to Talk';
        };

        audio.play().then(function() {
          if (typeof setAvatarState === 'function') setAvatarState('talking');
          var st = document.getElementById('statusText');
          if (st) st.textContent = 'MYRAA Speaking (' + (label || 'Kokoro-82M') + ')...';
          resolve(true);
        }).catch(function(err) {
          console.warn('Audio playback notice:', err);
          resolve(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  },

  /**
   * Offline WebSpeech tuned to Kokoro voice parameters
   */
  speakKokoroWebSpeech: function(text, voice) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);

      var profileMap = {
        'af_bella': { pitch: 1.25, rate: 0.98 },
        'af_sky': { pitch: 1.45, rate: 1.06 },
        'af_nicole': { pitch: 1.08, rate: 0.90 },
        'af_heart': { pitch: 1.55, rate: 1.00 }
      };
      var p = profileMap[voice] || profileMap['af_bella'];
      u.pitch = p.pitch;
      u.rate = p.rate;
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

      if (typeof setAvatarState === 'function') setAvatarState('talking');
      u.onend = function() {
        if (typeof setAvatarState === 'function') setAvatarState('idle');
        var st = document.getElementById('statusText');
        if (st) st.textContent = 'Tap Mic to Talk';
      };
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Kokoro WebSpeech fallback error:', e);
    }
  },

  playAudioUrl: function(url, label) {
    return new Promise(function(resolve) {
      try {
        if (window.myraaCurrentAudio) {
          try { window.myraaCurrentAudio.pause(); } catch (e) {}
          window.myraaCurrentAudio = null;
        }
        var audio = new Audio(url);
        window.myraaCurrentAudio = audio;
        audio.onended = function() {
          if (typeof setAvatarState === 'function') setAvatarState('idle');
          var st = document.getElementById('statusText');
          if (st) st.textContent = 'Tap Mic to Talk';
        };
        audio.play().then(function() {
          if (typeof setAvatarState === 'function') setAvatarState('talking');
          var st = document.getElementById('statusText');
          if (st) st.textContent = 'MYRAA Speaking (' + (label || 'Kokoro Voice') + ')...';
          resolve(true);
        }).catch(function(err) {
          console.warn('playAudioUrl notice:', err);
          resolve(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  },

  speakGoogleNeural: function(text) {
    return new Promise(function(resolve) {
      try {
        if (window.myraaCurrentAudio) {
          try { window.myraaCurrentAudio.pause(); } catch (e) {}
          window.myraaCurrentAudio = null;
        }
        var shortText = text.substring(0, 180);
        var url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(shortText) + '&tl=hi&client=tw-ob';
        var audio = new Audio(url);
        window.myraaCurrentAudio = audio;
        audio.onended = function() {
          if (typeof setAvatarState === 'function') setAvatarState('idle');
          var st = document.getElementById('statusText');
          if (st) st.textContent = 'Tap Mic to Talk';
        };
        audio.play().then(function() {
          if (typeof setAvatarState === 'function') setAvatarState('talking');
          var st = document.getElementById('statusText');
          if (st) st.textContent = 'MYRAA Speaking (Natural Voice)...';
          resolve(true);
        }).catch(function(err) {
          console.warn('Google Neural playback notice:', err);
          resolve(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  },

  playBase64Audio: function(base64Data, mimeType, label) {
    try {
      if (window.myraaCurrentAudio) {
        try { window.myraaCurrentAudio.pause(); } catch (e) {}
        window.myraaCurrentAudio = null;
      }
      var audio = new Audio('data:' + (mimeType || 'audio/wav') + ';base64,' + base64Data);
      window.myraaCurrentAudio = audio;
      audio.onended = function() {
        if (typeof setAvatarState === 'function') setAvatarState('idle');
        var st = document.getElementById('statusText');
        if (st) st.textContent = 'Tap Mic to Talk';
      };
      audio.play().then(function() {
        if (typeof setAvatarState === 'function') setAvatarState('talking');
        var st = document.getElementById('statusText');
        if (st) st.textContent = 'MYRAA Speaking (' + (label || 'Aoede Studio Voice') + ')...';
      }).catch(function(e) {
        console.warn('Base64 audio playback notice:', e);
      });
      return true;
    } catch (e) {
      console.warn('playBase64Audio error:', e);
      return false;
    }
  },

  speakNativeTts: function(text, pitch, rate) {
    var p = parseFloat(pitch || '1.30');
    var s = parseFloat(rate || '0.98');
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
