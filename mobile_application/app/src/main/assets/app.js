/**
 * MYRAA Mobile Core Application Controller
 * Features:
 * - Real-time Voice Recognition & Audio Reactive Visualizer
 * - Gemini 2.5 / 1.5 Flash Direct API Integration with Tool Calling
 * - Autonomous Mobile Actions (Touch, Swipe, Navigation, Apps, Flashlight, Location, Battery)
 * - Offline Fast Command Execution Engine
 * - Android Native TTS (Hindi/English) Voice Response
 * - Anime Holographic Avatar State Transitions (idle, thinking, talking)
 */

(function() {
  // DOM Elements
  const btnMicCall = document.getElementById('btnMicCall');
  const micIconOff = document.getElementById('micIconOff');
  const micIconOn = document.getElementById('micIconOn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const speakingBadge = document.getElementById('speakingBadge');
  const subtitleText = document.getElementById('subtitleText');
  const liveLatency = document.getElementById('liveLatency');
  const btnAccessibility = document.getElementById('btnAccessibility');
  const accessIcon = document.getElementById('accessIcon');
  const accessLabel = document.getElementById('accessLabel');
  const btnOverlayToggle = document.getElementById('btnOverlayToggle');
  const canvas = document.getElementById('visualizerCanvas');

  // Text Command Input Bar
  const inputUserCommand = document.getElementById('inputUserCommand');
  const btnSendCommand = document.getElementById('btnSendCommand');

  // Video Avatars
  const vIdle = document.getElementById('videoIdle');
  const vThinking = document.getElementById('videoThinking');
  const vTalking = document.getElementById('videoTalking');

  // Modals
  const btnSettings = document.getElementById('btnSettings');
  const modalSettings = document.getElementById('modalSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const inputApiKey = document.getElementById('inputApiKey');
  const btnSaveKey = document.getElementById('btnSaveKey');

  const modalPermissions = document.getElementById('modalPermissions');
  const btnClosePerms = document.getElementById('btnClosePerms');
  const btnGrantAccess = document.getElementById('btnGrantAccess');
  const btnGrantOverlay = document.getElementById('btnGrantOverlay');

  const btnOpenMemories = document.getElementById('btnOpenMemories');
  const modalMemories = document.getElementById('modalMemories');
  const btnCloseMemories = document.getElementById('btnCloseMemories');
  const memoriesList = document.getElementById('memoriesList');

  // State
  let isListening = false;
  let audioContext = null;
  let analyser = null;
  let micStream = null;
  let currentAvatarState = 'idle'; // idle | thinking | talking
  let torchState = false;
  let speechRecognition = null;
  let conversationHistory = [];

  // Canvas Audio Visualizer
  const ctx = canvas.getContext('2d');
  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!analyser || !isListening) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 120;

    ctx.beginPath();
    ctx.strokeStyle = currentAvatarState === 'talking' ? 'rgba(192, 132, 252, 0.7)' : 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 2.5;

    for (let i = 0; i < bufferLength; i += 4) {
      const v = dataArray[i] / 255.0;
      const angle = (i / bufferLength) * Math.PI * 2;
      const r = radius + (v * 45);
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }
  drawVisualizer();

  // Avatar Video State Switcher
  function setAvatarState(state) {
    if (currentAvatarState === state) return;
    currentAvatarState = state;

    [vIdle, vThinking, vTalking].forEach(v => {
      v.classList.remove('active');
      v.pause();
    });

    let targetVideo = vIdle;
    if (state === 'thinking') targetVideo = vThinking;
    else if (state === 'talking') targetVideo = vTalking;

    targetVideo.classList.add('active');
    targetVideo.play().catch(() => {});

    if (state === 'talking') {
      speakingBadge.classList.remove('hidden');
    } else {
      speakingBadge.classList.add('hidden');
    }
  }

  // Update Accessibility & Overlay Status in Header
  function updateServiceStatus() {
    if (typeof MobileBridge !== 'undefined') {
      const accessOk = MobileBridge.isAccessibilityActive();
      if (accessOk) {
        btnAccessibility.classList.remove('pill-warning');
        btnAccessibility.classList.add('pill-success');
        accessIcon.textContent = '♿';
        accessLabel.textContent = 'Access ON';
      } else {
        btnAccessibility.classList.remove('pill-success');
        btnAccessibility.classList.add('pill-warning');
        accessIcon.textContent = '⚠️';
        accessLabel.textContent = 'Enable Access';
      }
    }
  }
  setInterval(updateServiceStatus, 2000);
  updateServiceStatus();

  // Initialize Speech Recognition
  function initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      speechRecognition = new SpeechRec();
      speechRecognition.continuous = false;
      speechRecognition.interimResults = false;
      speechRecognition.lang = 'hi-IN';

      speechRecognition.onresult = function(event) {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          handleUserQuery(transcript);
        }
      };

      speechRecognition.onerror = function(err) {
        console.warn('Speech recognition notice:', err.error);
        stopListeningMode();
      };

      speechRecognition.onend = function() {
        if (isListening) {
          stopListeningMode();
        }
      };
    }
  }
  initSpeechRecognition();

  // Voice Mic Toggle
  btnMicCall.addEventListener('click', async () => {
    if (isListening) {
      stopListeningMode();
    } else {
      await startListeningMode();
    }
  });

  async function startListeningMode() {
    try {
      MobileBridge.vibrate(50);
      statusText.textContent = "Listening to you...";
      statusDot.classList.add('connected');
      btnMicCall.classList.add('active');
      micIconOff.classList.add('hidden');
      micIconOn.classList.remove('hidden');
      isListening = true;

      // Audio Context for reactive visualizer
      if (!audioContext) {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(micStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
      }

      // Start recognition
      if (speechRecognition) {
        try {
          speechRecognition.start();
        } catch (e) {
          console.log('Recognition restart:', e);
        }
      }
    } catch (err) {
      console.warn("Mic access notice:", err);
      statusText.textContent = "Tap Mic to Talk";
      isListening = false;
    }
  }

  function stopListeningMode() {
    isListening = false;
    btnMicCall.classList.remove('active');
    micIconOff.classList.remove('hidden');
    micIconOn.classList.add('hidden');
    statusDot.classList.remove('connected');
    statusText.textContent = "Tap Mic to Talk";

    if (speechRecognition) {
      try { speechRecognition.stop(); } catch (e) {}
    }
  }

  // Handle Text Command Send
  if (btnSendCommand && inputUserCommand) {
    btnSendCommand.addEventListener('click', () => {
      const q = inputUserCommand.value.trim();
      if (q) {
        inputUserCommand.value = '';
        handleUserQuery(q);
      }
    });

    inputUserCommand.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = inputUserCommand.value.trim();
        if (q) {
          inputUserCommand.value = '';
          handleUserQuery(q);
        }
      }
    });
  }

  // Speak and Display Response
  function speakAndDisplay(text) {
    subtitleText.textContent = text;
    setAvatarState('talking');
    statusText.textContent = "MYRAA Speaking...";

    MobileBridge.speak(text);

    // Estimate speaking duration: ~150 words per minute -> 400ms per word + 1s buffer
    const wordCount = text.split(/\s+/).length;
    const durationMs = Math.max(2500, wordCount * 350 + 1000);

    setTimeout(() => {
      setAvatarState('idle');
      statusText.textContent = "Tap Mic to Talk";
      liveLatency.textContent = "Ready";
    }, durationMs);
  }

  // Studio Audio Playback Engine (Gapless Aoede Voice like PC & Web)
  function playStudioAudio(base64Data, mimeType) {
    if (!base64Data) return;
    setAvatarState('talking');
    statusText.textContent = "MYRAA Speaking (Studio Voice)...";

    try {
      if (window.myraaCurrentAudio) {
        try { window.myraaCurrentAudio.pause(); } catch (e) {}
      }
      const audio = new Audio(`data:${mimeType || 'audio/mp3'};base64,${base64Data}`);
      window.myraaCurrentAudio = audio;
      audio.onended = () => {
        setAvatarState('idle');
        statusText.textContent = "Tap Mic to Talk";
        liveLatency.textContent = "Ready";
      };
      audio.play().catch(e => {
        console.warn("Studio audio play notice:", e);
        MobileBridge.speak(subtitleText.textContent);
      });
    } catch (e) {
      console.warn("Studio audio playback error:", e);
      MobileBridge.speak(subtitleText.textContent);
    }
  }

  // Core Query Processing: Offline Parser + Gemini 2.5 Flash Tool Calling
  async function handleUserQuery(query) {
    stopListeningMode();
    MobileBridge.vibrate(30);

    subtitleText.textContent = `Piyu: "${query}"`;
    setAvatarState('thinking');
    statusText.textContent = "MYRAA soch rahi hai...";
    liveLatency.textContent = "Thinking...";

    // 1. Check Fast Offline Commands
    const localHandled = executeOfflineCommand(query);
    if (localHandled) return;

    // 2. Online Gemini API Call
    const apiKey = localStorage.getItem('MYRAA_API_KEY');
    if (apiKey && apiKey.trim().length > 10) {
      await callGeminiApi(query, apiKey.trim());
    } else {
      setTimeout(() => {
        speakAndDisplay("Maine aapka command suna Piyu! Deep conversations aur custom AI actions ke liye Settings (⚙️) me jakar apna Gemini API Key save karein.");
      }, 600);
    }
  }

  // Fast Offline Command Matcher
  function executeOfflineCommand(text) {
    const q = text.toLowerCase();

    // YouTube
    if (q.includes('youtube') || q.includes('yt')) {
      speakAndDisplay("YouTube open kar rahi hoon, Piyu!");
      setTimeout(() => MobileBridge.openApp('com.google.android.youtube'), 600);
      return true;
    }

    // WhatsApp Send Message & Open
    if (q.includes('whatsapp')) {
      if (q.includes('message') || q.includes('bhejo') || q.includes('send') || q.includes('karo') || q.includes('msg')) {
        let target = "";
        let message = "";
        if (text.includes(':')) {
          const parts = text.split(':');
          message = parts.slice(1).join(':').trim();
          target = parts[0].replace(/whatsapp/gi, '').replace(/par/gi, '').replace(/ko/gi, '').replace(/message/gi, '').replace(/bhejo/gi, '').replace(/send/gi, '').replace(/to/gi, '').trim();
        } else {
          const clean = text.replace(/whatsapp/gi, '').replace(/par/gi, '').replace(/message/gi, '').replace(/bhejo/gi, '').trim();
          const words = clean.split(/\s+/);
          if (words.length > 1) {
            target = words[0].replace(/ko$/i, '');
            message = words.slice(1).join(' ');
          } else {
            target = clean;
            message = "Hello!";
          }
        }
        speakAndDisplay(`${target ? target + ' ko ' : ''}WhatsApp message send kar rahi hoon!`);
        MobileBridge.sendWhatsApp(target, message);
        return true;
      } else {
        speakAndDisplay("WhatsApp open kar rahi hoon!");
        setTimeout(() => MobileBridge.openApp('com.whatsapp'), 600);
        return true;
      }
    }

    // Instagram
    if (q.includes('instagram') || q.includes('insta')) {
      speakAndDisplay("Instagram open kar rahi hoon!");
      setTimeout(() => MobileBridge.openApp('com.instagram.android'), 600);
      return true;
    }

    // Flashlight / Torch
    if (q.includes('torch on') || q.includes('flashlight on') || q.includes('light on')) {
      torchState = true;
      MobileBridge.setFlashlight(true);
      speakAndDisplay("Flashlight on kar di hai!");
      return true;
    }
    if (q.includes('torch off') || q.includes('flashlight off') || q.includes('light off') || q.includes('torch band')) {
      torchState = false;
      MobileBridge.setFlashlight(false);
      speakAndDisplay("Flashlight band kar di hai!");
      return true;
    }

    // Home Screen
    if (q.includes('home') || q.includes('home screen') || q.includes('screen par jao')) {
      speakAndDisplay("Home screen par aa gaye hain!");
      setTimeout(() => MobileBridge.pressHome(), 400);
      return true;
    }

    // Back
    if (q.includes('back') || q.includes('peeche')) {
      speakAndDisplay("Back kar diya!");
      setTimeout(() => MobileBridge.pressBack(), 300);
      return true;
    }

    // Battery
    if (q.includes('battery') || q.includes('charge')) {
      const bat = MobileBridge.getBattery();
      if (bat.success) {
        speakAndDisplay(`Aapka phone ${bat.level}% charged hai ${bat.isCharging ? 'aur charging ho raha hai' : ''}.`);
      } else {
        speakAndDisplay("Battery status check nahi ho paya.");
      }
      return true;
    }

    // Location
    if (q.includes('location') || q.includes('kaha hoon') || q.includes('gps')) {
      const loc = MobileBridge.getLocation();
      if (loc.success) {
        speakAndDisplay(`Aapki location: Latitude ${loc.latitude.toFixed(3)}, Longitude ${loc.longitude.toFixed(3)}.`);
      } else {
        speakAndDisplay("Location fetch nahi hui, please GPS on karein.");
      }
      return true;
    }

    // Scroll down / up
    if (q.includes('scroll down') || q.includes('neeche scroll')) {
      speakAndDisplay("Neeche scroll kar diya!");
      MobileBridge.swipe(500, 1500, 500, 500, 300);
      return true;
    }
    if (q.includes('scroll up') || q.includes('upar scroll')) {
      speakAndDisplay("Upar scroll kar diya!");
      MobileBridge.swipe(500, 500, 500, 1500, 300);
      return true;
    }

    // Screenshot
    if (q.includes('screenshot') || q.includes('photo khicho') || q.includes('capture screen')) {
      speakAndDisplay("Screenshot capture kar liya!");
      setTimeout(() => MobileBridge.takeScreenshot(), 400);
      return true;
    }

    // Lock Screen
    if (q.includes('lock screen') || q.includes('phone lock') || q.includes('screen lock')) {
      speakAndDisplay("Phone lock kar rahi hoon!");
      setTimeout(() => MobileBridge.lockScreen(), 400);
      return true;
    }

    // Read Screen
    if (q.includes('screen padho') || q.includes('read screen') || q.includes('screen par kya hai') || q.includes('kya likha hai')) {
      speakAndDisplay("Screen scan kar rahi hoon...");
      setTimeout(() => {
        const txt = MobileBridge.dumpScreenText();
        const shortTxt = txt ? txt.replace(/\s+/g, ' ').substring(0, 120) : "Screen empty hai.";
        speakAndDisplay(`Screen par ye likha hai: ${shortTxt}`);
      }, 700);
      return true;
    }

    // Server Info
    if (q.includes('server') || q.includes('port 3002') || q.includes('local server')) {
      const s = MobileBridge.getServerInfo();
      speakAndDisplay(`Port 3002 par local server active hai! IP address ${s.ip} hai.`);
      const modalServer = document.getElementById('modalServer');
      if (modalServer) modalServer.classList.remove('hidden');
      return true;
    }

    // Click by Text (e.g. "click search", "click subscribe", "click next")
    if (q.startsWith('click ') || q.startsWith('tap ') || q.includes('par click karo')) {
      let target = q.replace(/^click\s+|^tap\s+/i, '').replace(/par click karo/i, '').trim();
      if (target) {
        speakAndDisplay(`${target} par click kar rahi hoon!`);
        MobileBridge.clickByText(target);
        return true;
      }
    }

    // Type text (e.g. "type hello", "likho hello")
    if (q.startsWith('type ') || q.startsWith('likho ')) {
      let textToType = q.replace(/^type\s+|^likho\s+/i, '').trim();
      if (textToType) {
        speakAndDisplay(`${textToType} type kar rahi hoon!`);
        MobileBridge.typeText(textToType);
        return true;
      }
    }

    // Greeting
    if (q.includes('hello') || q.includes('namaste') || q.includes('kaise ho') || q.includes('kaisi ho') || q.includes('hi myraa')) {
      speakAndDisplay("Namaste Piyu! Main badhiya hoon. Aapke poore phone ke super controls mere pass hain, batayiye kya karoon?");
      return true;
    }

    return false;
  }

  // Gemini API Tool Calling Definitions
  const geminiTools = [
    {
      functionDeclarations: [
        {
          name: "openApp",
          description: "Launches any application on the Android device by name (e.g. youtube, whatsapp, chrome, settings, camera, instagram).",
          parameters: {
            type: "OBJECT",
            properties: {
              appName: { type: "STRING", description: "The common name of the app to launch." }
            },
            required: ["appName"]
          }
        },
        {
          name: "setFlashlight",
          description: "Turns the mobile camera torch / flashlight on or off.",
          parameters: {
            type: "OBJECT",
            properties: {
              enable: { type: "BOOLEAN", description: "true to turn torch ON, false to turn torch OFF." }
            },
            required: ["enable"]
          }
        },
        {
          name: "pressHome",
          description: "Navigates to the Android home screen.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "pressBack",
          description: "Performs an Android Back navigation.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "scrollScreen",
          description: "Scrolls or swipes the phone screen in a specified direction (down, up, left, right).",
          parameters: {
            type: "OBJECT",
            properties: {
              direction: { type: "STRING", enum: ["down", "up", "left", "right"], description: "Scroll direction" }
            },
            required: ["direction"]
          }
        },
        {
          name: "getBatteryStatus",
          description: "Returns the current battery level percentage and charging state.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "sendWhatsAppMessage",
          description: "Sends a WhatsApp message to a specific contact or phone number. Use when the user asks to send a WhatsApp message, chat with someone on WhatsApp, or send a text on WhatsApp.",
          parameters: {
            type: "OBJECT",
            properties: {
              contactOrNumber: { type: "STRING", description: "The contact name (e.g. Rahul, Piyush, Mummy) or phone number." },
              message: { type: "STRING", description: "The message text to send." }
            },
            required: ["message"]
          }
        },
        {
          name: "takeScreenshot",
          description: "Captures a screenshot of the phone screen.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "lockScreen",
          description: "Locks the Android phone screen.",
          parameters: { type: "OBJECT", properties: {} }
        },
        {
          name: "clickText",
          description: "Clicks on any button or text element visible on the screen.",
          parameters: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING", description: "The text of the button to click." }
            },
            required: ["text"]
          }
        },
        {
          name: "typeText",
          description: "Types text into the active input box on the screen.",
          parameters: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING", description: "The text to type." }
            },
            required: ["text"]
          }
        },
        {
          name: "readScreenContent",
          description: "Extracts and reads the visible text and buttons currently on the user's screen.",
          parameters: { type: "OBJECT", properties: {} }
        }
      ]
    }
  ];

  const systemInstruction = {
    parts: [
      {
        text: `You are MYRAA, a hyper-intelligent, loyal, and friendly personal AI assistant created by and for Piyush (Piyu).
You are running as a native Android app on Piyush's mobile phone with full Super Access permissions (Accessibility Touch Control, Screen Reading, Overlay, App Launching, Hardware Flashlight, GPS).
- Always talk in natural, polite, respectful Hindi / Hinglish.
- Call Piyush 'Piyu' warmly.
- If the user asks you to operate their phone (open an app, scroll, go home, turn on torch, read screen, check battery), ALWAYS call the matching tool function immediately.
- Keep your verbal responses concise, witty, engaging, and clear so they sound natural when spoken aloud via Text-to-Speech.`
      }
    ]
  };

  // Call Gemini REST API directly
  async function callGeminiApi(query, apiKey) {
    const startTime = Date.now();
    try {
      conversationHistory.push({
        role: "user",
        parts: [{ text: query }]
      });

      // Keep last 10 turns
      if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
      }

      // Try gemini-2.5-flash or gemini-2.0-flash or gemini-1.5-flash
      const model = "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: systemInstruction,
          contents: conversationHistory,
          tools: geminiTools
        })
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;
      liveLatency.textContent = `${elapsed}ms`;

      if (data.error) {
        console.error("Gemini API error:", data.error);
        speakAndDisplay(`Gemini API error: ${data.error.message || 'Key invalid'}`);
        return;
      }

      const candidate = data.candidates && data.candidates[0];
      if (!candidate || !candidate.content) {
        speakAndDisplay("Maaf kijiye Piyu, mujhe response generate karne me dikkat aayi.");
        return;
      }

      const parts = candidate.content.parts || [];
      let toolCalled = false;
      let replySpeech = "";
      let audioPlayed = false;

      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          playStudioAudio(part.inlineData.data, part.inlineData.mimeType || "audio/mp3");
          audioPlayed = true;
        } else if (part.functionCall) {
          toolCalled = true;
          const fn = part.functionCall;
          const resultText = handleGeminiToolCall(fn.name, fn.args || {});
          replySpeech += (replySpeech ? " " : "") + resultText;
        } else if (part.text) {
          replySpeech += (replySpeech ? " " : "") + part.text;
        }
      }

      conversationHistory.push(candidate.content);
      if (audioPlayed) {
        subtitleText.textContent = replySpeech || "MYRAA (Studio Voice Active)";
      } else {
        speakAndDisplay(replySpeech || "Command execute kar diya hai!");
      }

    } catch (err) {
      console.error("Gemini API fetch exception:", err);
      // Fallback
      executeOfflineCommand(query);
    }
  }

  // Handle Tool Calls returned by Gemini
  function handleGeminiToolCall(name, args) {
    switch (name) {
      case "sendWhatsAppMessage":
        const target = args.contactOrNumber || args.target || "";
        const msg = args.message || "";
        MobileBridge.sendWhatsApp(target, msg);
        return `${target ? target + ' ko ' : ''}WhatsApp par message dispatch kiya: "${msg}"!`;

      case "takeScreenshot":
        MobileBridge.takeScreenshot();
        return "Screenshot capture kar liya!";

      case "lockScreen":
        MobileBridge.lockScreen();
        return "Screen lock kar di hai!";

      case "clickText":
        MobileBridge.clickByText(args.text);
        return `${args.text} par click kar diya!`;

      case "typeText":
        MobileBridge.typeText(args.text);
        return `${args.text} type kar diya!`;

      case "openApp":
        const app = args.appName || "youtube";
        MobileBridge.openApp(app);
        return `${app} open kar rahi hoon!`;

      case "setFlashlight":
        const enable = !!args.enable;
        MobileBridge.setFlashlight(enable);
        return enable ? "Flashlight on kar di hai!" : "Flashlight off kar di hai!";

      case "pressHome":
        MobileBridge.pressHome();
        return "Home screen par aa gaye!";

      case "pressBack":
        MobileBridge.pressBack();
        return "Back navigate kiya!";

      case "scrollScreen":
        if (args.direction === 'up') {
          MobileBridge.swipe(500, 500, 500, 1500, 300);
          return "Upar scroll kar diya!";
        } else {
          MobileBridge.swipe(500, 1500, 500, 500, 300);
          return "Neeche scroll kar diya!";
        }

      case "getBatteryStatus":
        const bat = MobileBridge.getBattery();
        return `Battery level ${bat.level}% hai.`;

      case "readScreenContent":
        const txt = MobileBridge.dumpScreenText();
        return `Screen content: ${txt.substring(0, 120)}`;

      default:
        MobileBridge.executeMobileTool(name, args);
        return "Command complete ho gaya!";
    }
  }

  // Quick Action Buttons Handler
  document.querySelectorAll('.pill-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      MobileBridge.vibrate(30);

      switch (tool) {
        case 'open_youtube':
          speakAndDisplay("YouTube open kar rahi hoon!");
          setTimeout(() => MobileBridge.openApp('com.google.android.youtube'), 600);
          break;

        case 'open_whatsapp':
          speakAndDisplay("WhatsApp open kar rahi hoon!");
          setTimeout(() => MobileBridge.openApp('com.whatsapp'), 600);
          break;

        case 'mobile_home':
          speakAndDisplay("Home screen par jaa rahi hoon!");
          setTimeout(() => MobileBridge.pressHome(), 400);
          break;

        case 'mobile_torch':
          torchState = !torchState;
          MobileBridge.setFlashlight(torchState);
          btn.textContent = torchState ? '🔦 Torch ON' : '🔦 Flashlight';
          speakAndDisplay(torchState ? "Flashlight on kar di hai." : "Flashlight band kar di hai.");
          break;

        case 'mobile_location':
          const loc = MobileBridge.getLocation();
          if (loc.success) {
            speakAndDisplay(`Aapki location: Latitude ${loc.latitude.toFixed(3)}, Longitude ${loc.longitude.toFixed(3)}.`);
          } else {
            speakAndDisplay("Location fetch nahi ho saki. Kripya GPS on karein.");
          }
          break;

        case 'mobile_battery':
          const bat = MobileBridge.getBattery();
          if (bat.success) {
            speakAndDisplay(`Aapka phone ${bat.level}% charged hai ${bat.isCharging ? 'aur charging ho raha hai' : ''}.`);
          }
          break;

        case 'mobile_read':
          speakAndDisplay("Screen scan kar rahi hoon...");
          setTimeout(() => {
            const screenText = MobileBridge.dumpScreenText();
            speakAndDisplay(`Screen content scanned:\n${screenText.substring(0, 100)}`);
          }, 800);
          break;

        case 'mobile_screenshot':
          speakAndDisplay("Screenshot capture kar liya!");
          setTimeout(() => MobileBridge.takeScreenshot(), 400);
          break;

        case 'mobile_lock':
          speakAndDisplay("Screen lock kar rahi hoon!");
          setTimeout(() => MobileBridge.lockScreen(), 400);
          break;
      }
    });
  });

  // Permissions Modal
  btnAccessibility.addEventListener('click', () => {
    modalPermissions.classList.remove('hidden');
  });
  btnClosePerms.addEventListener('click', () => {
    modalPermissions.classList.add('hidden');
  });
  btnGrantAccess.addEventListener('click', () => {
    MobileBridge.openAccessibilitySettings();
  });
  btnGrantOverlay.addEventListener('click', () => {
    MobileBridge.openOverlaySettings();
  });

  // Floating Bubble Toggle
  let bubbleActive = false;
  btnOverlayToggle.addEventListener('click', () => {
    MobileBridge.vibrate(40);
    bubbleActive = !bubbleActive;
    if (bubbleActive) {
      MobileBridge.startFloatingBubble();
      btnOverlayToggle.classList.add('pill-success');
    } else {
      MobileBridge.stopFloatingBubble();
      btnOverlayToggle.classList.remove('pill-success');
    }
  });

  // Local Server 3002 Modal & Status
  const btnServerStatus = document.getElementById('btnServerStatus');
  const modalServer = document.getElementById('modalServer');
  const btnCloseServer = document.getElementById('btnCloseServer');
  const serverLocalUrl = document.getElementById('serverLocalUrl');
  const serverWifiUrl = document.getElementById('serverWifiUrl');
  const btnCopyLocalUrl = document.getElementById('btnCopyLocalUrl');
  const btnCopyWifiUrl = document.getElementById('btnCopyWifiUrl');

  function updateServerDisplay() {
    const s = MobileBridge.getServerInfo();
    if (s && s.running) {
      if (serverLocalUrl) serverLocalUrl.textContent = s.localUrl;
      if (serverWifiUrl) serverWifiUrl.textContent = s.wifiUrl;
      if (btnServerStatus) {
        btnServerStatus.classList.remove('pill-warning');
        btnServerStatus.classList.add('pill-success');
      }
    } else {
      if (btnServerStatus) {
        btnServerStatus.classList.remove('pill-success');
        btnServerStatus.classList.add('pill-warning');
      }
    }
  }
  setInterval(updateServerDisplay, 4000);
  updateServerDisplay();

  if (btnServerStatus && modalServer) {
    btnServerStatus.addEventListener('click', () => {
      updateServerDisplay();
      modalServer.classList.remove('hidden');
    });
  }
  if (btnCloseServer && modalServer) {
    btnCloseServer.addEventListener('click', () => {
      modalServer.classList.add('hidden');
    });
  }
  if (btnCopyLocalUrl && serverLocalUrl) {
    btnCopyLocalUrl.addEventListener('click', () => {
      navigator.clipboard.writeText(serverLocalUrl.textContent);
      alert("Localhost URL copied: " + serverLocalUrl.textContent);
    });
  }
  if (btnCopyWifiUrl && serverWifiUrl) {
    btnCopyWifiUrl.addEventListener('click', () => {
      navigator.clipboard.writeText(serverWifiUrl.textContent);
      alert("Wi-Fi URL copied: " + serverWifiUrl.textContent);
    });
  }

  // Settings Modal Elements
  const selectVoiceEngine = document.getElementById('selectVoiceEngine');
  const elevenLabsConfig = document.getElementById('elevenLabsConfig');
  const inputElevenKey = document.getElementById('inputElevenKey');
  const inputElevenVoice = document.getElementById('inputElevenVoice');
  const btnSaveEleven = document.getElementById('btnSaveEleven');
  const rangePitch = document.getElementById('rangePitch');
  const rangeSpeed = document.getElementById('rangeSpeed');
  const labelPitch = document.getElementById('labelPitch');
  const labelSpeed = document.getElementById('labelSpeed');
  const btnTestVoice = document.getElementById('btnTestVoice');
  const btnOpenTtsSettings = document.getElementById('btnOpenTtsSettings');

  // Load Saved Voice Preferences
  function loadVoiceSettings() {
    const savedEngine = localStorage.getItem('MYRAA_VOICE_ENGINE') || 'enhanced';
    if (selectVoiceEngine) {
      selectVoiceEngine.value = savedEngine;
      if (elevenLabsConfig) {
        elevenLabsConfig.style.display = savedEngine === 'elevenlabs' ? 'block' : 'none';
      }
    }
    const savedPitch = localStorage.getItem('MYRAA_VOICE_PITCH') || '1.25';
    const savedSpeed = localStorage.getItem('MYRAA_VOICE_SPEED') || '1.0';
    if (rangePitch) rangePitch.value = savedPitch;
    if (labelPitch) labelPitch.textContent = `Voice Pitch: ${savedPitch}x`;
    if (rangeSpeed) rangeSpeed.value = savedSpeed;
    if (labelSpeed) labelSpeed.textContent = `Voice Speed: ${savedSpeed}x`;
    if (inputElevenKey) inputElevenKey.value = localStorage.getItem('MYRAA_ELEVEN_KEY') || '';
    if (inputElevenVoice) inputElevenVoice.value = localStorage.getItem('MYRAA_ELEVEN_VOICE') || '21m00Tcm4TlvDq8ikWAM';

    MobileBridge.setVoiceSettings(parseFloat(savedPitch), parseFloat(savedSpeed));
  }
  loadVoiceSettings();

  // Live API Key Tester Elements
  const btnTestKey = document.getElementById('btnTestKey');
  const testBtnSpinner = document.getElementById('testBtnSpinner');
  const testResultBox = document.getElementById('testResultBox');

  // Settings Modal Open
  btnSettings.addEventListener('click', () => {
    modalSettings.classList.remove('hidden');
    inputApiKey.value = localStorage.getItem('MYRAA_API_KEY') || '';
    if (testResultBox) testResultBox.classList.add('hidden');
    loadVoiceSettings();
  });
  btnCloseSettings.addEventListener('click', () => {
    modalSettings.classList.add('hidden');
  });
  btnSaveKey.addEventListener('click', () => {
    const val = inputApiKey.value.trim().replace(/^["']|["']$/g, '');
    localStorage.setItem('MYRAA_API_KEY', val);
    speakAndDisplay("Gemini API Key save ho gaya hai Piyu!");
  });

  // Live API Key Connection Tester
  if (btnTestKey && inputApiKey && testResultBox) {
    btnTestKey.addEventListener('click', async () => {
      const key = inputApiKey.value.trim().replace(/^["']|["']$/g, '');
      if (!key) {
        testResultBox.className = "test-result-box error";
        testResultBox.innerHTML = "<strong>⚠️ Key Missing</strong><br>Pehle apna Google Gemini API Key paste karein.";
        testResultBox.classList.remove('hidden');
        return;
      }

      if (testBtnSpinner) testBtnSpinner.classList.remove('hidden');
      btnTestKey.disabled = true;
      testResultBox.className = "test-result-box";
      testResultBox.innerHTML = "<span>Connecting to Google Gemini API...</span>";
      testResultBox.classList.remove('hidden');

      const startTime = Date.now();
      const testModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      let verified = false;
      let usedModel = "";
      let errDetail = "";

      for (const m of testModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Respond with OK.' }] }]
            })
          });
          const data = await res.json();
          if (data.candidates && data.candidates.length > 0) {
            verified = true;
            usedModel = m;
            break;
          } else if (data.error) {
            errDetail = data.error.message || JSON.stringify(data.error);
          }
        } catch (e) {
          errDetail = e.message || String(e);
        }
      }

      const elapsed = Date.now() - startTime;
      if (testBtnSpinner) testBtnSpinner.classList.add('hidden');
      btnTestKey.disabled = false;

      if (verified) {
        localStorage.setItem('MYRAA_API_KEY', key);
        testResultBox.className = "test-result-box success";
        testResultBox.innerHTML = `<strong>✅ Connection Successful!</strong><br>Verified with <strong>${usedModel}</strong> in <strong>${elapsed}ms</strong>.<br>Key is valid and automatically saved!`;
        speakAndDisplay("API Key verified ho gaya hai Piyu! Ab main poori tarah active hoon.");
      } else {
        testResultBox.className = "test-result-box error";
        testResultBox.innerHTML = `<strong>❌ Test Failed</strong><br>${errDetail || 'API key could not be authenticated.'}<br><small style="opacity:0.8;">Make sure key is from Google AI Studio.</small>`;
      }
    });
  }

  // Voice Engine Toggle
  if (selectVoiceEngine) {
    selectVoiceEngine.addEventListener('change', () => {
      const val = selectVoiceEngine.value;
      localStorage.setItem('MYRAA_VOICE_ENGINE', val);
      if (elevenLabsConfig) {
        elevenLabsConfig.style.display = val === 'elevenlabs' ? 'block' : 'none';
      }
    });
  }

  // ElevenLabs Save
  if (btnSaveEleven) {
    btnSaveEleven.addEventListener('click', () => {
      const k = inputElevenKey.value.trim();
      const v = inputElevenVoice.value.trim() || '21m00Tcm4TlvDq8ikWAM';
      localStorage.setItem('MYRAA_ELEVEN_KEY', k);
      localStorage.setItem('MYRAA_ELEVEN_VOICE', v);
      speakAndDisplay("ElevenLabs Studio voice credentials save ho gaye!");
    });
  }

  // Pitch & Speed Sliders
  if (rangePitch) {
    rangePitch.addEventListener('input', () => {
      labelPitch.textContent = `Voice Pitch: ${rangePitch.value}x`;
      localStorage.setItem('MYRAA_VOICE_PITCH', rangePitch.value);
      MobileBridge.setVoiceSettings(parseFloat(rangePitch.value), parseFloat(rangeSpeed.value));
    });
  }

  if (rangeSpeed) {
    rangeSpeed.addEventListener('input', () => {
      labelSpeed.textContent = `Voice Speed: ${rangeSpeed.value}x`;
      localStorage.setItem('MYRAA_VOICE_SPEED', rangeSpeed.value);
      MobileBridge.setVoiceSettings(parseFloat(rangePitch.value), parseFloat(rangeSpeed.value));
    });
  }

  // Test Voice Button
  if (btnTestVoice) {
    btnTestVoice.addEventListener('click', () => {
      speakAndDisplay("Namaste Piyu! Main aapki personal AI assistant MYRAA hoon. Kya ab meri aawaz aapko theek lag rahi hai?");
    });
  }

  // Open Android TTS Settings Button
  if (btnOpenTtsSettings) {
    btnOpenTtsSettings.addEventListener('click', () => {
      MobileBridge.openTtsSettings();
    });
  }

  // Memories Modal
  btnOpenMemories.addEventListener('click', () => {
    modalMemories.classList.remove('hidden');
    loadLocalMemories();
  });
  btnCloseMemories.addEventListener('click', () => {
    modalMemories.classList.add('hidden');
  });

  function loadLocalMemories() {
    memoriesList.innerHTML = `
      <div class="perm-card">
        <div class="perm-info">
          <h4>Piyush (Piyu)</h4>
          <p>Nickname: Piyu | Language: Hindi/Hinglish</p>
        </div>
      </div>
      <div class="perm-card">
        <div class="perm-info">
          <h4>Autonomous Mobile Access</h4>
          <p>Touch Control, App Automation &amp; Direct Voice Execution</p>
        </div>
      </div>
      <div class="perm-card">
        <div class="perm-info">
          <h4>Hardware Goal</h4>
          <p>Buying RTX 5090 | Setup: RX 580 8GB + i3 10th Gen</p>
        </div>
      </div>
    `;
  }

})();
