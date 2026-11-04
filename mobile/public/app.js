/**
 * MYRAA Mobile Voice Edition — Client Application
 * Full-duplex real-time voice streaming with Gemini Live API.
 * Uses native Web Audio API (16kHz in, 24kHz out) & 60fps Canvas particle visualizer.
 */

class MyraaMobileClient {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.micStream = null;
    this.micProcessor = null;
    this.analyser = null;
    this.freqData = null;
    this.isPlaying = false;
    this.isConnected = false;
    this.state = "idle"; // idle | connecting | listening | speaking

    // Scheduled audio queue
    this.nextPlayTime = 0;
    this.activeAudioSources = [];
    this.wakeLock = null;

    this.initDOMElements();
    this.initCanvasVisualizer();
    this.bindEvents();
    this.checkConfig();
  }

  initDOMElements() {
    this.btnToggleCall = document.getElementById("btnToggleCall");
    this.iconMic = document.getElementById("iconMic");
    this.iconHangup = document.getElementById("iconHangup");
    this.statusDot = document.getElementById("statusDot");
    this.statusText = document.getElementById("statusText");
    this.orbGlow = document.getElementById("orbGlow");
    this.captionCard = document.getElementById("captionCard");
    this.captionText = document.getElementById("captionText");
    this.callHint = document.getElementById("callHint");
    this.waveBars = document.querySelectorAll(".wave-bar");
    this.waveContainer = document.getElementById("waveBars");

    // Modal
    this.btnSettings = document.getElementById("btnSettings");
    this.settingsModal = document.getElementById("settingsModal");
    this.btnCloseSettings = document.getElementById("btnCloseSettings");
    this.btnSaveKey = document.getElementById("btnSaveKey");
    this.inputApiKey = document.getElementById("inputApiKey");
  }

  bindEvents() {
    this.btnToggleCall.addEventListener("click", () => this.toggleCall());
    this.btnSettings.addEventListener("click", () => this.openSettings());
    this.btnCloseSettings.addEventListener("click", () => this.closeSettings());
    this.btnSaveKey.addEventListener("click", () => this.saveApiKey());

    // Window resize for canvas
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  async checkConfig() {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (!data.hasApiKey) {
        this.openSettings();
      }
    } catch {
      /* ignore */
    }
  }

  openSettings() {
    this.settingsModal.classList.remove("hidden");
  }

  closeSettings() {
    this.settingsModal.classList.add("hidden");
  }

  async saveApiKey() {
    const key = this.inputApiKey.value.trim();
    if (!key) return alert("Please enter a valid Gemini API key.");
    try {
      const res = await fetch("/api/config/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (data.ok) {
        this.closeSettings();
        this.statusText.textContent = "Key Saved. Tap to Connect";
      } else {
        alert(data.error || "Failed to save key");
      }
    } catch (err) {
      alert("Error saving key: " + err.message);
    }
  }

  // --- Call Lifecycle ---
  async toggleCall() {
    if (this.isConnected) {
      this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    this.setState("connecting");
    this.statusText.textContent = "Starting audio engine...";

    try {
      // 1. Initialize Web Audio Context on user tap (browser policy requirement)
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Analyser for output/input visualizer
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      // 2. Request Screen Wake Lock (prevents mobile phone screen from sleeping)
      if ("wakeLock" in navigator) {
        try {
          this.wakeLock = await navigator.wakeLock.request("screen");
        } catch {
          /* optional feature */
        }
      }

      // 3. Connect WebSocket to /live
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      this.ws = new WebSocket(`${protocol}//${window.location.host}/live`);

      this.ws.onopen = () => {
        this.statusText.textContent = "Connecting to Myraa...";
      };

      this.ws.onmessage = (event) => this.handleServerMessage(event);

      this.ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        this.disconnect("Connection error");
      };

      this.ws.onclose = () => {
        this.disconnect("Call ended");
      };

      // 4. Capture Microphone Stream
      await this.startMicrophone();

      this.isConnected = true;
      this.btnToggleCall.classList.remove("idle");
      this.btnToggleCall.classList.add("active");
      this.iconMic.classList.add("hidden");
      this.iconHangup.classList.remove("hidden");
      this.callHint.textContent = "Tap red button to end call";
      this.waveContainer.classList.add("active");
    } catch (err) {
      console.error("Connection failed:", err);
      alert("Failed to start voice call: " + (err.message || err));
      this.disconnect("Failed to start");
    }
  }

  async startMicrophone() {
    // 16kHz layout sampling with AEC for mobile
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const source = micCtx.createMediaStreamSource(this.micStream);
    const processor = micCtx.createScriptProcessor(2048, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Convert Float32 to Signed Int16 Little-Endian PCM
      const pcm16 = this.floatTo16BitPCM(inputData);
      const base64Audio = this.base64ArrayBuffer(pcm16);

      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm",
                data: base64Audio,
              },
            ],
          },
        })
      );
    };

    source.connect(processor);
    processor.connect(micCtx.destination);
    this.micProcessor = processor;
  }

  disconnect(reason = "Tap to Connect") {
    this.isConnected = false;
    this.setState("idle");

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }

    this.stopAllAudio();
    this.btnToggleCall.classList.remove("active");
    this.btnToggleCall.classList.add("idle");
    this.iconMic.classList.remove("hidden");
    this.iconHangup.classList.add("hidden");
    this.statusText.textContent = reason;
    this.callHint.textContent = "Tap to start voice call";
    this.waveContainer.classList.remove("active");
  }

  handleServerMessage(event) {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === "status") {
        if (msg.status === "ready") {
          this.setState("listening");
          this.statusText.textContent = "Listening to you...";
        } else if (msg.status === "connecting_gemini") {
          this.statusText.textContent = "Waking up Myraa...";
        }
      } else if (msg.type === "audio") {
        this.playAudioChunk(msg.data);
      } else if (msg.type === "transcript") {
        this.showCaption(msg.text);
      } else if (msg.type === "interrupted") {
        this.stopAllAudio();
        this.setState("listening");
        this.statusText.textContent = "Listening...";
      } else if (msg.type === "error") {
        alert(msg.error);
        this.disconnect("Error occurred");
      }
    } catch (err) {
      console.error("Error processing server message:", err);
    }
  }

  // --- Audio Playback Engine (24kHz Gapless) ---
  playAudioChunk(base64Data) {
    if (!this.audioContext) return;
    this.setState("speaking");
    this.statusText.textContent = "Myraa is speaking...";

    const uint8 = this.base64ToUint8Array(base64Data);
    const float32 = this.pcm16ToFloats(uint8);

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Connect to analyser and speakers
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + buffer.duration;

    this.activeAudioSources.push(source);

    source.onended = () => {
      const idx = this.activeAudioSources.indexOf(source);
      if (idx !== -1) this.activeAudioSources.splice(idx, 1);
      if (this.activeAudioSources.length === 0 && this.isConnected) {
        this.setState("listening");
        this.statusText.textContent = "Listening...";
      }
    };
  }

  stopAllAudio() {
    this.activeAudioSources.forEach((src) => {
      try {
        src.stop();
      } catch {
        /* ignore */
      }
    });
    this.activeAudioSources = [];
    this.nextPlayTime = 0;
  }

  setState(newState) {
    this.state = newState;
    this.statusDot.className = "status-dot " + (newState === "idle" ? "" : newState);
    this.orbGlow.className = "orb-glow " + (newState === "idle" ? "" : newState);
  }

  showCaption(text) {
    this.captionCard.classList.remove("hidden");
    this.captionText.textContent = `"${text}"`;
  }

  // --- Utilities ---
  floatTo16BitPCM(input) {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  pcm16ToFloats(uint8Array) {
    const int16 = new Int16Array(
      uint8Array.buffer,
      uint8Array.byteOffset,
      uint8Array.byteLength / 2
    );
    const floats = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      floats[i] = int16[i] / 32768.0;
    }
    return floats;
  }

  base64ArrayBuffer(arrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToUint8Array(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // --- 60FPS Audio-Reactive Canvas Visualizer ---
  initCanvasVisualizer() {
    this.canvas = document.getElementById("visualizerCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.resizeCanvas();
    this.initParticles();
    this.animate();
  }

  resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  initParticles() {
    const count = 40;
    this.particles = Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: 90 + Math.random() * 60,
      size: 1.5 + Math.random() * 2,
      speed: 0.005 + Math.random() * 0.015,
      color: Math.random() > 0.5 ? "rgba(192, 132, 252, " : "rgba(56, 189, 248, ",
      alpha: 0.2 + Math.random() * 0.5,
    }));
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.ctx.clearRect(0, 0, this.width, this.height);

    let audioEnergy = 0;
    if (this.analyser && this.freqData && this.isConnected) {
      this.analyser.getByteFrequencyData(this.freqData);
      let sum = 0;
      for (let i = 0; i < 8; i++) sum += this.freqData[i];
      audioEnergy = sum / 8 / 255; // 0.0 .. 1.0

      // Update waveform bars
      this.waveBars.forEach((bar, idx) => {
        const val = (this.freqData[idx * 2] || 0) / 255;
        bar.style.height = `${Math.max(4, val * 24)}px`;
      });
    }

    const cx = this.width / 2;
    const cy = this.height / 2 - 20;

    // Draw orbiting energy particles
    this.particles.forEach((p) => {
      p.angle += p.speed * (1 + audioEnergy * 3);
      const currentDist = p.distance + audioEnergy * 35;
      const x = cx + Math.cos(p.angle) * currentDist;
      const y = cy + Math.sin(p.angle) * currentDist;

      this.ctx.beginPath();
      this.ctx.arc(x, y, p.size * (1 + audioEnergy * 0.8), 0, Math.PI * 2);
      this.ctx.fillStyle = `${p.color}${p.alpha + audioEnergy * 0.4})`;
      this.ctx.fill();
    });
  }
}

// Start application when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  new MyraaMobileClient();
});
