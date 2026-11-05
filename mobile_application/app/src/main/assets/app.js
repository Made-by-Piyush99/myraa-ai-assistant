/**
 * MYRAA Mobile Core Application Controller
 * Handles audio visualizer, video avatars, voice session, and mobile super-commands.
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
  let isConnected = false;
  let audioContext = null;
  let analyser = null;
  let micStream = null;
  let currentAvatarState = 'idle'; // idle | thinking | talking
  let torchState = false;

  // Initialize Canvas
  const ctx = canvas.getContext('2d');
  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Draw Audio Waveform & Particles
  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!analyser || !isConnected) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 120;

    ctx.beginPath();
    ctx.strokeStyle = currentAvatarState === 'talking' ? 'rgba(192, 132, 252, 0.6)' : 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 2;

    for (let i = 0; i < bufferLength; i += 4) {
      const v = dataArray[i] / 255.0;
      const angle = (i / bufferLength) * Math.PI * 2;
      const r = radius + (v * 40);
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

  // Avatar Video Switcher
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
  setInterval(updateServiceStatus, 2000);
  updateServiceStatus();

  // Voice Call Toggle
  btnMicCall.addEventListener('click', async () => {
    if (isConnected) {
      disconnectVoice();
    } else {
      await connectVoice();
    }
  });

  async function connectVoice() {
    try {
      MobileBridge.vibrate(50);
      statusText.textContent = "Connecting Voice...";

      // Get Microphone
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(micStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      isConnected = true;
      btnMicCall.classList.add('active');
      micIconOff.classList.add('hidden');
      micIconOn.classList.remove('hidden');
      statusDot.classList.add('connected');
      statusText.textContent = "Listening to you...";
      liveLatency.textContent = "Live";
      setAvatarState('idle');

      subtitleText.textContent = "Main sun rahi hoon Piyu! Koi bhi command boliye, jaise 'YouTube kholo', 'Flashlight on karo', ya 'Home screen jao'.";
    } catch (err) {
      console.error("Microphone access error:", err);
      statusText.textContent = "Mic Denied";
      alert("Please grant Microphone permission in your phone settings.");
    }
  }

  function disconnectVoice() {
    MobileBridge.vibrate(50);
    isConnected = false;
    btnMicCall.classList.remove('active');
    micIconOff.classList.remove('hidden');
    micIconOn.classList.add('hidden');
    statusDot.classList.remove('connected');
    statusText.textContent = "Tap Mic to Talk";
    liveLatency.textContent = "Ready";
    setAvatarState('idle');

    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  }

  // Quick Action Buttons Handler
  document.querySelectorAll('.pill-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.getAttribute('data-tool');
      MobileBridge.vibrate(30);

      switch (tool) {
        case 'open_youtube':
          setAvatarState('talking');
          subtitleText.textContent = "YouTube khol rahi hoon...";
          setTimeout(() => {
            MobileBridge.openApp('com.google.android.youtube');
            setAvatarState('idle');
          }, 600);
          break;

        case 'open_whatsapp':
          setAvatarState('talking');
          subtitleText.textContent = "WhatsApp khol rahi hoon...";
          setTimeout(() => {
            MobileBridge.openApp('com.whatsapp');
            setAvatarState('idle');
          }, 600);
          break;

        case 'mobile_home':
          setAvatarState('talking');
          subtitleText.textContent = "Home screen par jaa rahi hoon...";
          setTimeout(() => {
            MobileBridge.pressHome();
            setAvatarState('idle');
          }, 400);
          break;

        case 'mobile_torch':
          torchState = !torchState;
          MobileBridge.setFlashlight(torchState);
          btn.textContent = torchState ? '🔦 Torch ON' : '🔦 Flashlight';
          subtitleText.textContent = torchState ? "Flashlight on kar di hai." : "Flashlight off kar di hai.";
          break;

        case 'mobile_location':
          const loc = MobileBridge.getLocation();
          if (loc.success) {
            subtitleText.textContent = `Aapki current location: Lat ${loc.latitude.toFixed(4)}, Long ${loc.longitude.toFixed(4)} (Accuracy: ${loc.accuracy}m)`;
          } else {
            subtitleText.textContent = "Location fetch nahi ho saki. Kripya GPS enable karein.";
          }
          break;

        case 'mobile_battery':
          const bat = MobileBridge.getBattery();
          if (bat.success) {
            subtitleText.textContent = `Aapka battery level ${bat.level}% hai ${bat.isCharging ? '(Charging ho raha hai ⚡)' : ''}.`;
          }
          break;

        case 'mobile_read':
          setAvatarState('thinking');
          const screenText = MobileBridge.dumpScreenText();
          setTimeout(() => {
            setAvatarState('talking');
            subtitleText.textContent = `Screen content scanned:\n${screenText.substring(0, 150)}...`;
            setTimeout(() => setAvatarState('idle'), 3000);
          }, 500);
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

  // Settings Modal
  btnSettings.addEventListener('click', () => {
    modalSettings.classList.remove('hidden');
    inputApiKey.value = localStorage.getItem('MYRAA_API_KEY') || '';
  });
  btnCloseSettings.addEventListener('click', () => {
    modalSettings.classList.add('hidden');
  });
  btnSaveKey.addEventListener('click', () => {
    localStorage.setItem('MYRAA_API_KEY', inputApiKey.value.trim());
    modalSettings.classList.add('hidden');
    alert("API Key saved successfully!");
  });

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
          <h4>Current Project</h4>
          <p>ElevenLabs Custom Voice & Full Mobile Super Access Control</p>
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
