/**
 * MYRAA Mobile Voice Edition — Client Application
 * Full-duplex real-time voice streaming with Gemini Live API.
 * Features:
 * - 16kHz microphone stream -> Gemini 3.1 Flash Live -> 24kHz gapless playback
 * - Live Gemini API Key Connection Tester (/api/config/test)
 * - Full Memory Core Dashboard (View, Filter, Add, Delete)
 * - Voice Persona Switcher (Aoede, Puck, Kore, Fenrir, Charon)
 * - YouTube Mini-Player with Auto-Embed
 * - 60FPS Audio-Reactive Holographic Particle Visualizer
 */

class MyraaMobileClient {
  constructor() {
    this.ws = null;
    this.audioContext = null;
    this.micStream = null;
    this.micProcessor = null;
    this.analyser = null;
    this.freqData = null;
    this.isConnected = false;
    this.state = "idle"; // idle | connecting | listening | speaking

    // Scheduled audio queue for 24kHz gapless playback
    this.nextPlayTime = 0;
    this.activeAudioSources = [];
    this.wakeLock = null;

    // State data
    this.memories = [];
    this.activeCategoryFilter = "all";
    this.selectedVoice = "Aoede";
    this.audioOutputMode = "speaker"; // 'speaker' | 'earpiece'
    this.phoneFilterNode = null;
    this.outputGainNode = null;
    this.micAudioContext = null;

    this.initDOMElements();
    this.initCanvasVisualizer();
    this.bindEvents();
    this.loadInitialConfig();
  }

  initDOMElements() {
    // Stage & Controls
    this.btnToggleCall = document.getElementById("btnToggleCall");
    this.iconMic = document.getElementById("iconMic");
    this.iconHangup = document.getElementById("iconHangup");
    this.statusDot = document.getElementById("statusDot");
    this.statusText = document.getElementById("statusText");
    this.speakingBadge = document.getElementById("speakingBadge");
    this.orbGlow = document.getElementById("orbGlow");
    this.captionCard = document.getElementById("captionCard");
    this.captionText = document.getElementById("captionText");
    this.callHint = document.getElementById("callHint");
    this.waveBars = document.querySelectorAll(".wave-bar");
    this.waveContainer = document.getElementById("waveBars");

    // Speaker / Earpiece Toggles
    this.btnSpeakerToggle = document.getElementById("btnSpeakerToggle");
    this.speakerIcon = document.getElementById("speakerIcon");
    this.speakerLabel = document.getElementById("speakerLabel");
    this.btnCallSpeakerToggle = document.getElementById("btnCallSpeakerToggle");
    this.callSpeakerIcon = document.getElementById("callSpeakerIcon");
    this.callSpeakerText = document.getElementById("callSpeakerText");

    // Header Badges
    this.btnOpenMemories = document.getElementById("btnOpenMemories");
    this.headerMemCount = document.getElementById("headerMemCount");
    this.btnSettings = document.getElementById("btnSettings");

    // Settings Modal
    this.settingsModal = document.getElementById("settingsModal");
    this.btnCloseSettings = document.getElementById("btnCloseSettings");
    this.tabButtons = document.querySelectorAll(".modal-tabs .tab-btn");
    this.tabContents = document.querySelectorAll(".tab-content");

    // API Key & Test Tab
    this.inputApiKey = document.getElementById("inputApiKey");
    this.btnToggleKeyVis = document.getElementById("btnToggleKeyVis");
    this.btnTestKey = document.getElementById("btnTestKey");
    this.testBtnSpinner = document.getElementById("testBtnSpinner");
    this.testResultBox = document.getElementById("testResultBox");
    this.btnSaveKey = document.getElementById("btnSaveKey");

    // Voice Tab
    this.voiceCards = document.querySelectorAll(".voice-card");
    this.btnSaveVoice = document.getElementById("btnSaveVoice");

    // Memory Modal
    this.memoryModal = document.getElementById("memoryModal");
    this.btnCloseMemories = document.getElementById("btnCloseMemories");
    this.memCountModal = document.getElementById("memCountModal");
    this.filterPills = document.querySelectorAll(".filter-pill");
    this.memoryListContainer = document.getElementById("memoryListContainer");
    this.newMemCategory = document.getElementById("newMemCategory");
    this.newMemText = document.getElementById("newMemText");
    this.btnAddMemory = document.getElementById("btnAddMemory");

    // YouTube Mini-Player
    this.ytPlayerCard = document.getElementById("ytPlayerCard");
    this.ytTrackTitle = document.getElementById("ytTrackTitle");
    this.ytIframe = document.getElementById("ytIframe");
    this.btnCloseYt = document.getElementById("btnCloseYt");
  }

  bindEvents() {
    // Call Button
    this.btnToggleCall.addEventListener("click", () => this.toggleCall());

    // Speaker / Earpiece Toggles
    if (this.btnSpeakerToggle) {
      this.btnSpeakerToggle.addEventListener("click", () => this.toggleSpeakerMode());
    }
    if (this.btnCallSpeakerToggle) {
      this.btnCallSpeakerToggle.addEventListener("click", () => this.toggleSpeakerMode());
    }

    // Settings Modal
    this.btnSettings.addEventListener("click", () => this.openSettings());
    this.btnCloseSettings.addEventListener("click", () => this.closeSettings());
    this.settingsModal.addEventListener("click", (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });

    // Tab Navigation
    this.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        this.switchTab(targetTab);
      });
    });

    // API Key Visibility Toggle
    this.btnToggleKeyVis.addEventListener("click", () => {
      const isPwd = this.inputApiKey.type === "password";
      this.inputApiKey.type = isPwd ? "text" : "password";
      this.btnToggleKeyVis.textContent = isPwd ? "🙈" : "👁️";
    });

    // Live API Test Button
    this.btnTestKey.addEventListener("click", () => this.testApiKeyConnection());

    // Save API Key Button
    this.btnSaveKey.addEventListener("click", () => this.saveApiKey());

    // Voice Selection Cards
    this.voiceCards.forEach((card) => {
      card.addEventListener("click", () => {
        this.voiceCards.forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        this.selectedVoice = card.getAttribute("data-voice");
      });
    });
    this.btnSaveVoice.addEventListener("click", () => this.saveVoicePreference());

    // Memory Modal
    this.btnOpenMemories.addEventListener("click", () => this.openMemoryModal());
    this.btnCloseMemories.addEventListener("click", () => this.closeMemoryModal());
    this.memoryModal.addEventListener("click", (e) => {
      if (e.target === this.memoryModal) this.closeMemoryModal();
    });

    // Memory Filters
    this.filterPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        this.filterPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.activeCategoryFilter = pill.getAttribute("data-category");
        this.renderMemories();
      });
    });

    // Add Memory
    this.btnAddMemory.addEventListener("click", () => this.addNewMemory());
    this.newMemText.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.addNewMemory();
    });

    // YouTube Mini-Player Close
    this.btnCloseYt.addEventListener("click", () => this.closeYouTubePlayer());

    // Window resize for visualizer canvas
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  // --- Initial Configuration & State Fetching ---
  async loadInitialConfig() {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();

      if (data.voice) {
        this.selectedVoice = data.voice;
        this.voiceCards.forEach((card) => {
          if (card.getAttribute("data-voice") === data.voice) {
            card.classList.add("active");
          } else {
            card.classList.remove("active");
          }
        });
      }

      if (typeof data.memoryCount === "number") {
        this.updateMemoryCounts(data.memoryCount);
      }

      if (!data.hasApiKey) {
        this.openSettings();
        this.switchTab("tabApi");
      }
    } catch (err) {
      console.warn("Could not load initial config:", err);
    }
  }

  // --- Tab Management ---
  switchTab(tabId) {
    this.tabButtons.forEach((btn) => {
      if (btn.getAttribute("data-tab") === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    this.tabContents.forEach((content) => {
      if (content.id === tabId) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });
  }

  openSettings() {
    this.settingsModal.classList.remove("hidden");
  }

  closeSettings() {
    this.settingsModal.classList.add("hidden");
  }

  // --- API Testing & Management ---
  async testApiKeyConnection() {
    let key = this.inputApiKey.value.trim().replace(/^["']|["']$/g, "");

    if (!key) {
      this.testResultBox.className = "test-result-box error";
      this.testResultBox.innerHTML = `
        <div style="font-weight: 600;">⚠️ Key Missing</div>
        <div style="font-size: 0.8rem; margin-top: 4px;">Pehle input box me apna Google Gemini API Key daaliye.</div>
      `;
      this.testResultBox.classList.remove("hidden");
      return;
    }

    if (key.startsWith("AQ.")) {
      this.testResultBox.className = "test-result-box error";
      this.testResultBox.innerHTML = `
        <div style="font-weight: 600;">⚠️ Galat Key Type (AQ... Token)</div>
        <div style="font-size: 0.8rem; margin-top: 4px; line-height: 1.4;">
          Aapne jo key daali hai woh <strong>AQ.</strong> se shuru ho rahi hai (yeh Google Gemini API key nahi hai).<br><br>
          Google Gemini API key hamesha <strong>AIzaSy...</strong> se shuru hoti hai (~39 characters).
        </div>
        <div style="margin-top: 8px;">
          <a href="https://aistudio.google.com/app/apikey" target="_blank" style="display: inline-block; background: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 0.78rem; font-weight: 600;">
            👉 Google AI Studio se Free Key lein
          </a>
        </div>
      `;
      this.testResultBox.classList.remove("hidden");
      return;
    }

    this.testBtnSpinner.classList.remove("hidden");
    this.btnTestKey.disabled = true;
    this.testResultBox.className = "test-result-box";
    this.testResultBox.innerHTML = `<span>Testing connection to Google Gemini API...</span>`;
    this.testResultBox.classList.remove("hidden");

    try {
      const res = await fetch("/api/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();

      if (data.ok) {
        const modelName = data.model || "Gemini 3.8 Flash";
        this.testResultBox.className = "test-result-box success";
        this.testResultBox.innerHTML = `
          <div style="font-weight: 600;">✅ Connection Successful!</div>
          <div style="font-size: 0.8rem; margin-top: 4px; opacity: 0.9;">
            Verified with <strong>${modelName}</strong> in <strong>${data.latencyMs}ms</strong>. Key is valid and active.
          </div>
        `;
      } else {
        let errDisplay = data.error || "Could not authenticate key.";
        try {
          const parsed = typeof errDisplay === "string" ? JSON.parse(errDisplay) : errDisplay;
          if (parsed?.error?.message) {
            errDisplay = parsed.error.message;
          }
        } catch {}

        this.testResultBox.className = "test-result-box error";
        this.testResultBox.innerHTML = `
          <div style="font-weight: 600;">❌ Test Failed</div>
          <div style="font-size: 0.8rem; margin-top: 4px; word-break: break-word; line-height: 1.4;">
            ${errDisplay}
          </div>
          <div style="font-size: 0.75rem; margin-top: 6px; color: #fca5a5;">
            💡 Tip: Make sure your key is from <a href="https://aistudio.google.com/" target="_blank" style="color: #93c5fd; text-decoration: underline;">Google AI Studio</a>.
          </div>
        `;
      }
    } catch (err) {
      this.testResultBox.className = "test-result-box error";
      this.testResultBox.innerHTML = `
        <div style="font-weight: 600;">❌ Network Error</div>
        <div style="font-size: 0.8rem; margin-top: 4px;">${err.message}</div>
      `;
    } finally {
      this.testBtnSpinner.classList.add("hidden");
      this.btnTestKey.disabled = false;
    }
  }

  async saveApiKey() {
    const key = this.inputApiKey.value.trim();
    if (!key) {
      alert("Please enter a valid Gemini API key first.");
      return;
    }

    try {
      const res = await fetch("/api/config/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key, voice: this.selectedVoice }),
      });
      const data = await res.json();

      if (data.ok) {
        this.closeSettings();
        this.statusText.textContent = "Key Saved. Tap to Connect";
        alert("API Key saved successfully! You can now start voice conversation.");
      } else {
        alert(data.error || "Failed to save key");
      }
    } catch (err) {
      alert("Error saving key: " + err.message);
    }
  }

  async saveVoicePreference() {
    try {
      const res = await fetch("/api/config/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: this.selectedVoice }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`Voice updated to ${this.selectedVoice}!`);
        this.closeSettings();
      }
    } catch (err) {
      alert("Error saving voice: " + err.message);
    }
  }

  // --- Memory Core Dashboard ---
  openMemoryModal() {
    this.memoryModal.classList.remove("hidden");
    this.fetchMemories();
  }

  closeMemoryModal() {
    this.memoryModal.classList.add("hidden");
  }

  updateMemoryCounts(count) {
    if (this.headerMemCount) this.headerMemCount.textContent = count;
    if (this.memCountModal) this.memCountModal.textContent = count;
  }

  async fetchMemories() {
    this.memoryListContainer.innerHTML = `<div class="empty-memory-state">Loading memories from brain...</div>`;
    try {
      const res = await fetch("/api/memories");
      const data = await res.json();
      this.memories = data.memories || [];
      this.updateMemoryCounts(this.memories.length);
      this.renderMemories();
    } catch (err) {
      this.memoryListContainer.innerHTML = `<div class="empty-memory-state" style="color: #f87171;">Failed to load memories: ${err.message}</div>`;
    }
  }

  renderMemories() {
    const filter = this.activeCategoryFilter.toLowerCase();
    const filtered = filter === "all"
      ? this.memories
      : this.memories.filter((m) => (m.category || "").toLowerCase() === filter);

    if (filtered.length === 0) {
      this.memoryListContainer.innerHTML = `
        <div class="empty-memory-state">
          No memories found${filter !== "all" ? ` for category "${filter}"` : ""}.
        </div>
      `;
      return;
    }

    // Render items sorted newest first
    const sorted = [...filtered].reverse();
    this.memoryListContainer.innerHTML = sorted
      .map(
        (m) => `
        <div class="memory-card-item" data-id="${m.id}">
          <div class="memory-card-header">
            <span class="memory-cat-badge ${m.category || 'general'}">${m.category || 'general'}</span>
            <button class="memory-del-btn" data-id="${m.id}" title="Forget memory">🗑️</button>
          </div>
          <div class="memory-card-text">${this.escapeHtml(m.text)}</div>
        </div>
      `
      )
      .join("");

    // Bind delete buttons
    this.memoryListContainer.querySelectorAll(".memory-del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const memId = btn.getAttribute("data-id");
        this.deleteMemory(memId);
      });
    });
  }

  async addNewMemory() {
    const text = this.newMemText.value.trim();
    const category = this.newMemCategory.value;
    if (!text) {
      alert("Please enter memory text to remember.");
      return;
    }

    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, text }),
      });
      const data = await res.json();

      if (data.ok && data.memory) {
        this.newMemText.value = "";
        this.memories.push(data.memory);
        this.updateMemoryCounts(this.memories.length);
        this.renderMemories();
      } else {
        alert(data.error || "Failed to add memory");
      }
    } catch (err) {
      alert("Error adding memory: " + err.message);
    }
  }

  async deleteMemory(id) {
    if (!confirm("Are you sure you want Myraa to forget this memory?")) return;

    try {
      const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.ok) {
        this.memories = this.memories.filter((m) => m.id !== id);
        this.updateMemoryCounts(this.memories.length);
        this.renderMemories();
      } else {
        alert(data.error || "Failed to delete memory");
      }
    } catch (err) {
      alert("Error deleting memory: " + err.message);
    }
  }

  // --- YouTube Mini-Player ---
  playYouTubeTrack(title, embedUrl) {
    this.ytTrackTitle.textContent = title || "Now Playing";
    this.ytIframe.src = embedUrl;
    this.ytPlayerCard.classList.remove("hidden");
  }

  closeYouTubePlayer() {
    this.ytIframe.src = "";
    this.ytPlayerCard.classList.add("hidden");
  }

  // --- Call Lifecycle & Audio Streaming ---
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
      // 1. Initialize Web Audio Context on user gesture (browser requirement)
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Analyser for output & visualizer
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      // Acoustic filter & gain chain for Speaker vs Earpiece phone call mode
      this.phoneFilterNode = this.audioContext.createBiquadFilter();
      this.phoneFilterNode.type = "allpass";

      this.outputGainNode = this.audioContext.createGain();
      this.outputGainNode.gain.value = 1.0;

      // Connect: source -> phoneFilter -> outputGain -> analyser -> destination
      this.phoneFilterNode.connect(this.outputGainNode);
      this.outputGainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Apply initial audio output mode
      await this.applySpeakerMode(this.audioOutputMode || "speaker");

      // 2. Request Screen Wake Lock (prevents mobile display from turning off during call)
      if ("wakeLock" in navigator) {
        try {
          this.wakeLock = await navigator.wakeLock.request("screen");
        } catch {
          /* optional */
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
    // 16kHz layout sampling with AEC for mobile phone calls
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    if (micCtx.state === "suspended") {
      await micCtx.resume();
    }
    const source = micCtx.createMediaStreamSource(this.micStream);
    const processor = micCtx.createScriptProcessor(2048, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Convert Float32 to Signed Int16 Little-Endian PCM
      const pcm16 = this.floatTo16BitPCM(inputData);
      const base64Audio = this.base64ArrayBuffer(pcm16);

      // Send to server
      this.ws.send(
        JSON.stringify({
          type: "audio_chunk",
          data: base64Audio,
        })
      );
    };

    source.connect(processor);
    // Connect to a silent gain node to prevent local feedback/echo
    const silentNode = micCtx.createGain();
    silentNode.gain.value = 0;
    processor.connect(silentNode);
    silentNode.connect(micCtx.destination);

    this.micProcessor = processor;
    this.micAudioContext = micCtx;
  }

  // --- Speaker vs Earpiece Phone Call Toggle ---
  async toggleSpeakerMode() {
    const nextMode = this.audioOutputMode === "speaker" ? "earpiece" : "speaker";
    await this.applySpeakerMode(nextMode);
  }

  async applySpeakerMode(mode) {
    this.audioOutputMode = mode;
    const isEarpiece = mode === "earpiece";

    if (this.phoneFilterNode && this.outputGainNode && this.audioContext) {
      if (isEarpiece) {
        // Telephonic earpiece acoustic tuning (bandpass 1800Hz, subtle gain calibration)
        this.phoneFilterNode.type = "bandpass";
        this.phoneFilterNode.frequency.setValueAtTime(1800, this.audioContext.currentTime);
        this.phoneFilterNode.Q.setValueAtTime(0.85, this.audioContext.currentTime);
        this.outputGainNode.gain.setValueAtTime(0.78, this.audioContext.currentTime);
      } else {
        // High-fidelity wide stereo loudspeaker
        this.phoneFilterNode.type = "allpass";
        this.outputGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
      }
    }

    // Update UI elements
    const icon = isEarpiece ? "📞" : "🔊";
    const label = isEarpiece ? "Earpiece" : "Speaker";
    const subLabel = isEarpiece ? "Call (Earpiece)" : "Loudspeaker";

    if (this.speakerIcon) this.speakerIcon.textContent = icon;
    if (this.speakerLabel) this.speakerLabel.textContent = label;
    if (this.callSpeakerIcon) this.callSpeakerIcon.textContent = icon;
    if (this.callSpeakerText) this.callSpeakerText.textContent = subLabel;

    if (this.btnCallSpeakerToggle) {
      this.btnCallSpeakerToggle.classList.toggle("earpiece-active", isEarpiece);
    }

    // Hardware setSinkId routing if supported on device
    if (this.audioContext && typeof this.audioContext.setSinkId === "function") {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter((d) => d.kind === "audiooutput");
        const target = outputs.find((d) => {
          const l = (d.label || "").toLowerCase();
          return isEarpiece
            ? l.includes("earpiece") || l.includes("receiver") || l.includes("phone")
            : l.includes("speaker") || l.includes("loudspeaker");
        });
        if (target) {
          await this.audioContext.setSinkId(target.deviceId);
        }
      } catch {
        /* hardware setSinkId optional */
      }
    }
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

    if (this.micAudioContext) {
      try {
        this.micAudioContext.close();
      } catch {}
      this.micAudioContext = null;
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
        } else if (msg.status === "connecting_gemini") {
          this.statusText.textContent = "Waking up Myraa...";
        }
      } else if (msg.type === "audio") {
        this.playAudioChunk(msg.data || msg.audio);
      } else if (msg.type === "transcript") {
        this.showCaption(msg.text);
      } else if (msg.type === "interrupted") {
        this.stopAllAudio();
        this.setState("listening");
      } else if (msg.type === "youtube_play") {
        this.playYouTubeTrack(msg.query || msg.title, msg.embedUrl);
      } else if (msg.type === "memory_saved" || msg.type === "memory_sync") {
        if (msg.memory) {
          this.showCaption(`Saved to memory: "${msg.memory.text}"`);
        }
        this.fetchMemories();
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
    if (!this.audioContext || !base64Data) return;
    this.setState("speaking");

    const uint8 = this.base64ToUint8Array(base64Data);
    const float32 = this.pcm16ToFloats(uint8);

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Connect source through phoneFilterNode -> outputGainNode -> analyser -> speakers
    if (this.phoneFilterNode) {
      source.connect(this.phoneFilterNode);
    } else if (this.analyser) {
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }

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

    if (newState === "speaking") {
      this.statusDot.classList.add("speaking");
      this.speakingBadge?.classList.remove("hidden");
      this.statusText.textContent = "Myraa is speaking...";
    } else {
      this.statusDot.classList.remove("speaking");
      this.speakingBadge?.classList.add("hidden");
      if (newState === "listening") {
        this.statusText.textContent = "Listening to you...";
      } else if (newState === "connecting") {
        this.statusText.textContent = "Connecting to Myraa...";
      } else if (newState === "idle") {
        this.statusText.textContent = "Tap to Connect";
      }
    }
  }

  showCaption(text) {
    if (!text) return;
    this.captionCard.classList.remove("hidden");
    this.captionText.textContent = `"${text}"`;
  }

  // --- Utilities ---
  escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

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
    const count = 42;
    this.particles = Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: 90 + Math.random() * 65,
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
