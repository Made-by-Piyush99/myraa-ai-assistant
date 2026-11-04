import React, { useEffect, useState } from "react";
import {
  Settings,
  X,
  Power,
  Mic,
  Cpu,
  Info,
  Check,
  AlertTriangle,
  Volume2,
  Sparkles,
  Shield,
  Chrome,
  Folder,
  Eye,
  Play,
  CheckCircle2,
  Key,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  MyraaSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "../lib/settingsStore";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current settings (owned by App so wake-word state stays in sync). */
  settings: MyraaSettings;
  /** Persist a settings patch (also notifies App of changes). */
  onChange: (patch: Partial<MyraaSettings>) => void;
  themeColor: string;
}

type SettingsTab = "general" | "permissions" | "voice" | "system" | "about";

/** A single toggle row matching the existing "Screen Vision Mode" switch style. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-left">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold font-mono text-slate-200">{label}</span>
        <span className="text-[8px] text-slate-400 uppercase font-mono max-w-[200px]">
          {description}
        </span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
          checked ? "bg-cyan-500" : "bg-white/10"
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({ isOpen, onClose, settings, onChange, themeColor }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [agentHealth, setAgentHealth] = useState<{
    online: boolean;
    toolCount?: number;
    cpu?: string;
    ram?: string;
  }>({ online: false });

  const [ytTesting, setYtTesting] = useState(false);
  const [ytStatus, setYtStatus] = useState<{ ok?: boolean; message?: string } | null>(null);

  const handleTestYoutubeKey = async () => {
    if (!settings.youtubeApiKey?.trim()) {
      setYtStatus({ ok: false, message: "Please enter an API key first." });
      return;
    }
    setYtTesting(true);
    setYtStatus(null);
    try {
      const res = await fetch(`/api/youtube/verify-key?key=${encodeURIComponent(settings.youtubeApiKey.trim())}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setYtStatus({ ok: true, message: "Key verified! YouTube Data API v3 connected." });
      } else {
        setYtStatus({ ok: false, message: data.error || "Key validation failed." });
      }
    } catch (err: any) {
      setYtStatus({ ok: false, message: err.message || "Could not contact verification server." });
    } finally {
      setYtTesting(false);
    }
  };

  // Enumerate microphones (mirrors how audio.ts grabs getUserMedia).
  useEffect(() => {
    if (!isOpen) return;
    const enumerate = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMics(devices.filter((d) => d.kind === "audioinput"));
      } catch {
        /* permission may be needed first */
      }
    };
    enumerate();
  }, [isOpen]);

  // Probe desktop agent health (port 8765) via the server-side logs/health proxy.
  useEffect(() => {
    if (!isOpen) return;
    const probe = async () => {
      try {
        // Re-use the local agent directly (same machine, same browser).
        const res = await fetch("http://127.0.0.1:8765/health", { cache: "no-store" });
        if (!res.ok) {
          setAgentHealth({ online: false });
          return;
        }
        const data = await res.json();
        setAgentHealth({ online: true, toolCount: data.tool_count });
      } catch {
        // Cross-origin may fail; try the server proxy as a fallback.
        try {
          const res2 = await fetch("/api/agent-health", { cache: "no-store" });
          if (res2.ok) {
            const d = await res2.json();
            setAgentHealth({ online: !!d.online, toolCount: d.tool_count });
            return;
          }
        } catch {
          /* ignore */
        }
        setAgentHealth({ online: false });
      }
    };
    probe();
    const id = setInterval(probe, 5000);
    return () => clearInterval(id);
  }, [isOpen]);

  const getThemeBadgeGlow = () => {
    switch (themeColor) {
      case "violet": return "border-purple-500/30 text-purple-400 bg-purple-500/10";
      case "crimson": return "border-rose-500/30 text-rose-400 bg-rose-500/10";
      case "emerald": return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
      case "celestial": return "border-sky-500/30 text-sky-400 bg-sky-500/10";
      case "gold": return "border-amber-500/30 text-amber-400 bg-amber-500/10";
      case "rose": return "border-pink-500/30 text-pink-400 bg-pink-500/10";
      case "charcoal":
      default:
        return "border-indigo-500/30 text-indigo-400 bg-indigo-500/10";
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "general", label: "GENERAL", icon: Power },
    { id: "permissions", label: "PERMISSIONS", icon: Shield },
    { id: "voice", label: "VOICE", icon: Mic },
    { id: "system", label: "SYSTEM", icon: Cpu },
    { id: "about", label: "ABOUT", icon: Info },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay — identical to MemoryDashboard */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />

          {/* Slide-over Container — identical shell to MemoryDashboard */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 w-full max-w-lg bg-[#020206]/95 border-l border-white/15 backdrop-blur-2xl z-50 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${getThemeBadgeGlow()}`}>
                  <Settings size={22} className="animate-spin [animation-duration:6s]" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-lg tracking-tight text-white flex items-center gap-2">
                    Myraa Configuration
                    <Sparkles size={14} className="text-cyan-400" />
                  </h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-0.5">
                    System settings &amp; preferences
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab selector row — mirrors MemoryDashboard pill style */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono tracking-wider transition shrink-0 cursor-pointer ${
                      active
                        ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                        : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={12} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* ---------------- GENERAL ---------------- */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Startup &amp; Appearance
                  </div>

                  <ToggleRow
                    label="LAUNCH AT STARTUP"
                    description="Start Myraa silently when Windows logs in"
                    checked={settings.autoStart}
                    onChange={(v) => {
                      onChange({ autoStart: v });
                      // Persist + push to backend; the desktop agent flips the
                      // HKCU Run registry key. We just record intent here.
                      void fetch("/api/settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ autoStart: v }),
                      }).catch(() => {});
                    }}
                  />

                  <ToggleRow
                    label="UI ANIMATIONS"
                    description="Enable motion and orb transitions"
                    checked={settings.animations}
                    onChange={(v) => onChange({ animations: v })}
                  />

                  {settings.autoStart && (
                    <div className="mt-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-mono text-emerald-300/80">
                        Myraa will auto-launch on next Windows login.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- PERMISSIONS ---------------- */}
              {activeTab === "permissions" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                      Security &amp; Device Permissions
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20 font-bold">
                      ENFORCED AT RUNTIME
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-white/5 bg-white/5 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-white font-medium">
                      <Shield size={14} className="text-cyan-400" />
                      Active Permission Governance
                    </div>
                    <p className="text-[9px] font-mono text-slate-400 leading-relaxed">
                      Toggle exact device access levels for Myraa. Any disallowed feature will be blocked instantly with zero execution.
                    </p>
                  </div>

                  {/* Core Permissions */}
                  <div className="space-y-3">
                    <ToggleRow
                      label="DESKTOP OS CONTROL"
                      description="Launch/close apps, adjust volume, screen brightness &amp; system power actions"
                      checked={settings.allowDesktopControl}
                      onChange={(v) => onChange({ allowDesktopControl: v })}
                    />

                    <ToggleRow
                      label="GOOGLE CHROME AUTOMATION"
                      description="Open tabs, search Google, navigate websites and control real Google Chrome"
                      checked={settings.allowChromeAccess}
                      onChange={(v) => onChange({ allowChromeAccess: v })}
                    />

                    <ToggleRow
                      label="LOCAL FILE SYSTEM ACCESS"
                      description="Allow creating, reading, listing, and searching project files on your PC"
                      checked={settings.allowFileSystem}
                      onChange={(v) => onChange({ allowFileSystem: v })}
                    />

                    <ToggleRow
                      label="SCREEN VISION &amp; CAPTURE"
                      description="Allow real-time screen capture streaming to Gemini multimodal vision"
                      checked={settings.allowScreenVision}
                      onChange={(v) => onChange({ allowScreenVision: v })}
                    />
                  </div>

                  {/* YouTube Integration Section */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        YouTube Integration &amp; Playback Target
                      </span>
                      <Play size={12} className="text-red-400" />
                    </div>

                    {/* Playback target toggle */}
                    <div className="p-3 rounded-xl border border-white/5 bg-white/5 space-y-2">
                      <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                        Playback Destination
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onChange({ youtubePlaybackTarget: "inapp" })}
                          className={`p-2.5 rounded-xl border text-xs font-mono flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                            settings.youtubePlaybackTarget === "inapp"
                              ? "border-red-500/50 bg-red-500/10 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                              : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          <Play size={14} />
                          <span className="font-bold">In-App Player</span>
                          <span className="text-[8px] text-slate-500">Holographic portal</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onChange({ youtubePlaybackTarget: "chrome" })}
                          className={`p-2.5 rounded-xl border text-xs font-mono flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                            settings.youtubePlaybackTarget === "chrome"
                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                              : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          <Chrome size={14} />
                          <span className="font-bold">Google Chrome</span>
                          <span className="text-[8px] text-slate-500">External desktop tab</span>
                        </button>
                      </div>
                    </div>

                    {/* YouTube API Key */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                          <Key size={11} className="text-amber-400" />
                          YouTube Data API v3 Key (Optional)
                        </label>
                        <span className="text-[8px] font-mono text-slate-500">
                          {settings.youtubeApiKey ? "CUSTOM KEY SET" : "DEFAULT ENGINE ACTIVE"}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={settings.youtubeApiKey || ""}
                          onChange={(e) => {
                            onChange({ youtubeApiKey: e.target.value });
                            setYtStatus(null);
                          }}
                          placeholder="AIzaSy..."
                          className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400/50 transition"
                        />
                        <button
                          type="button"
                          onClick={handleTestYoutubeKey}
                          disabled={ytTesting || !settings.youtubeApiKey}
                          className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-[10px] font-mono text-cyan-300 transition cursor-pointer"
                        >
                          {ytTesting ? "TESTING..." : "TEST KEY"}
                        </button>
                      </div>

                      {ytStatus && (
                        <div
                          className={`p-2 rounded-lg border text-[9px] font-mono flex items-center gap-1.5 ${
                            ytStatus.ok
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          }`}
                        >
                          {ytStatus.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          <span>{ytStatus.message}</span>
                        </div>
                      )}

                      <span className="text-[8px] text-slate-500 font-mono block">
                        Direct API connects live video stats, search &amp; trending lists. If left empty, Myraa seamlessly uses the built-in fast scraper engine!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- VOICE ---------------- */}
              {activeTab === "voice" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Wake Word &amp; Microphone
                  </div>

                  <ToggleRow
                    label="WAKE WORD"
                    description="Always-listen for the activation phrase"
                    checked={settings.wakeWordEnabled}
                    onChange={(v) => onChange({ wakeWordEnabled: v })}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                      Wake Phrase
                    </label>
                    <input
                      type="text"
                      value={settings.wakePhrase}
                      onChange={(e) => onChange({ wakePhrase: e.target.value })}
                      placeholder="hey myraa"
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400/50 transition"
                    />
                    <span className="text-[8px] text-slate-500 uppercase font-mono">
                      Say this phrase to activate Myraa
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                      Microphone
                    </label>
                    <select
                      value={settings.micDeviceId}
                      onChange={(e) => onChange({ micDeviceId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400/50 transition cursor-pointer"
                    >
                      <option value="">System Default</option>
                      {mics.map((m, i) => (
                        <option key={m.deviceId || i} value={m.deviceId}>
                          {m.label || `Microphone ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    <span className="text-[8px] text-slate-500 uppercase font-mono">
                      {mics.length === 0
                        ? "Grant mic permission to list devices"
                        : `${mics.length} device(s) detected`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                        Sensitivity
                      </label>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {settings.sensitivity}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.sensitivity}
                      onChange={(e) => onChange({ sensitivity: Number(e.target.value) })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <span className="text-[8px] text-slate-500 uppercase font-mono">
                      Higher = faster re-arm &amp; more matches
                    </span>
                  </div>
                </div>
              )}

              {/* ---------------- SYSTEM ---------------- */}
              {activeTab === "system" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Desktop Control Agent
                  </div>

                  <div
                    className={`p-4 rounded-xl border flex items-center gap-3 ${
                      agentHealth.online
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-rose-500/20 bg-rose-500/5"
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        agentHealth.online ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-xs font-mono text-white">
                        {agentHealth.online ? "Agent Online" : "Agent Offline"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {agentHealth.online
                          ? `${agentHealth.toolCount ?? 0} tools registered`
                          : "Start the Python agent on port 8765"}
                      </div>
                    </div>
                    <Cpu size={16} className="text-slate-500" />
                  </div>

                  <div className="p-3 rounded-xl border border-white/5 bg-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      <Volume2 size={12} /> Capabilities
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-300">
                      <span>✓ App control</span>
                      <span>✓ Browser</span>
                      <span>✓ Volume</span>
                      <span>✓ Brightness</span>
                      <span>✓ Power</span>
                      <span>✓ Files</span>
                      <span>✓ Screenshot</span>
                      <span>✓ Clipboard</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- ABOUT ---------------- */}
              {activeTab === "about" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    About Myraa
                  </div>

                  <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-cyan-400" />
                      <span className="text-sm font-display text-white">MYRAA AI Assistant</span>
                    </div>
                    <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>VERSION</span>
                        <span className="text-slate-300">V2.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ENGINE</span>
                        <span className="text-slate-300">Gemini Live</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DESKTOP</span>
                        <span className="text-slate-300">FastAPI Agent</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WAKE WORD</span>
                        <span className="text-slate-300">Web Speech API</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-500/15 bg-amber-500/5 flex items-start gap-2">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-mono text-amber-300/70 leading-relaxed">
                      Keep this tab active for wake-word detection. Microphone access
                      is required for voice activation.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer status bar — mirrors MemoryDashboard */}
            <div className="px-6 py-3 border-t border-white/5 bg-white/5 flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                Preferences auto-save
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                Myraa V2
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
