/**
 * MYRAA Mobile Voice Edition — Core Server (V2)
 * Full-duplex real-time voice companion for Android (Termux) & Mobile Web.
 * 
 * Includes:
 * - Real Google GenAI Live WebSocket connection with bidirectional PCM streaming
 * - Live API Key Testing & Validation endpoint (/api/config/test)
 * - Persistent Memory Dashboard sync (/api/memories)
 * - YouTube TV/Mobile Music resolution (/api/youtube/search)
 * - Configurable voices (Aoede, Puck, Kore, Fenrir, Charon)
 */

import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
import { MYRAA_BASE_PROMPT, formatSystemInstructionsWithMemories } from "../shared/persona.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const localEnv = path.join(__dirname, ".env");
const rootEnv = path.join(__dirname, "..", ".env");
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

// Memory file resolution
const sharedMemoriesFile = path.join(__dirname, "..", "shared", "memories.json");
const localMemoriesFile = path.join(__dirname, "memories.json");
const MEMORIES_PATH = fs.existsSync(sharedMemoriesFile) ? sharedMemoriesFile : localMemoriesFile;

// Config / Secrets file
const SECRETS_FILE = path.join(__dirname, "secrets.json");

function loadSecrets() {
  if (fs.existsSync(SECRETS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SECRETS_FILE, "utf-8")) || {};
    } catch {
      /* ignore */
    }
  }
  return {};
}

function saveSecrets(data) {
  const current = loadSecrets();
  const merged = { ...current, ...data };
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

function getApiKey() {
  const secrets = loadSecrets();
  if (secrets?.geminiApiKey?.trim()) return secrets.geminiApiKey.trim();
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "";
}

function getSelectedVoice() {
  const secrets = loadSecrets();
  return secrets?.voice || "Aoede";
}

function loadMemories() {
  try {
    if (fs.existsSync(MEMORIES_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORIES_PATH, "utf-8")) || [];
    }
  } catch (err) {
    console.error("[Memory] Error loading memories:", err.message);
  }
  return [];
}

function saveMemories(memories) {
  try {
    fs.writeFileSync(MEMORIES_PATH, JSON.stringify(memories, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[Memory] Error saving memories:", err.message);
    return false;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── REST APIs ──────────────────────────────────────────────────────────────

// 1. Get Config & Status
app.get("/api/config", (_req, res) => {
  const key = getApiKey();
  const masked = key ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : "";
  res.json({
    hasApiKey: Boolean(key),
    apiKeyMasked: masked,
    voice: getSelectedVoice(),
    platform: "Mobile Web & Termux",
    memoryCount: loadMemories().length
  });
});

// 2. Save API Key & Voice
app.post("/api/config/apikey", (req, res) => {
  const key = (req.body?.apiKey || "").trim();
  const voice = (req.body?.voice || "").trim();
  const update = {};
  if (key) update.geminiApiKey = key;
  if (voice) update.voice = voice;

  saveSecrets(update);
  res.json({ ok: true, hasApiKey: Boolean(getApiKey()), voice: getSelectedVoice() });
});

// 3. Live API Key Test Endpoint (Requested by user)
app.post("/api/config/test", async (req, res) => {
  const keyToTest = (req.body?.apiKey || "").trim() || getApiKey();
  if (!keyToTest) {
    return res.status(400).json({ ok: false, error: "No API key provided to test. Please enter a key." });
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey: keyToTest });
    // Quick test against standard Gemini model
    const testResp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Respond with the single word 'OK'."
    });

    const latencyMs = Date.now() - startTime;
    const replyText = testResp.text ? testResp.text.trim() : "OK";

    console.log(`[API Test] Success in ${latencyMs}ms:`, replyText);
    res.json({
      ok: true,
      message: "API Key is valid and active!",
      latencyMs,
      model: "gemini-2.5-flash"
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    console.error(`[API Test] Failed in ${latencyMs}ms:`, err.message || err);
    res.json({
      ok: false,
      error: err.message || "Failed to authenticate with Google Gemini API.",
      latencyMs
    });
  }
});

// 4. Memory APIs (List, Add, Delete)
app.get("/api/memories", (_req, res) => {
  res.json({ memories: loadMemories() });
});

app.post("/api/memories", (req, res) => {
  const { category, text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ ok: false, error: "Memory text is required." });
  }

  const list = loadMemories();
  const newMemory = {
    id: Math.random().toString(36).substring(2, 11),
    category: (category || "preference").trim().toLowerCase(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  list.push(newMemory);
  saveMemories(list);
  console.log(`[Memory] Added new memory: [${newMemory.category}] ${newMemory.text}`);
  res.json({ ok: true, memory: newMemory, total: list.length });
});

app.delete("/api/memories/:id", (req, res) => {
  const id = req.params.id;
  const list = loadMemories();
  const filtered = list.filter((m) => m.id !== id);
  if (filtered.length === list.length) {
    return res.status(404).json({ ok: false, error: "Memory not found." });
  }

  saveMemories(filtered);
  console.log(`[Memory] Deleted memory ID: ${id}`);
  res.json({ ok: true, remaining: filtered.length });
});

// 5. YouTube Search & Autoplay
app.get("/api/youtube/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const fetchRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await fetchRes.text();
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match && match[1]) {
      const videoId = match[1];
      return res.json({
        ok: true,
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`
      });
    }
    res.json({ ok: false, error: "No video found for query." });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "online", mode: "mobile-voice-v2", timestamp: new Date().toISOString() });
});

// ─── WEBSOCKET GEMINI LIVE STREAMING ────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/live" });

wss.on("connection", async (clientWs) => {
  console.log("[Mobile Live] Client connected from mobile web");
  const apiKey = getApiKey();
  const voiceName = getSelectedVoice();

  if (!apiKey) {
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: "NO_API_KEY: Please add and test your Gemini API Key in Settings to talk with Myraa."
      })
    );
    return;
  }

  clientWs.send(JSON.stringify({ type: "status", status: "connecting_gemini" }));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const memories = loadMemories();
    const systemInstruction = formatSystemInstructionsWithMemories(MYRAA_BASE_PROMPT, memories);

    // Official @google/genai Live Session
    const session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || "Aoede"
            }
          }
        },
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              {
                name: "playYouTubeMusic",
                description: "Plays any song, track, music, or video on YouTube. Call this when the user asks to play music, play a song, or watch a video clip.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: { type: Type.STRING, description: "The song title or artist to play." }
                  },
                  required: ["query"]
                }
              },
              {
                name: "saveCustomMemory",
                description: "Saves a new fact, preference, user detail, or personal goal into Myraa's persistent memory.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING, description: "Category: 'identity', 'preference', 'goal', 'project', or 'general'." },
                    text: { type: Type.STRING, description: "The memory fact to remember." }
                  },
                  required: ["category", "text"]
                }
              }
            ]
          }
        ]
      }
    });

    console.log("[Mobile Live] Gemini Live session connected successfully!");
    clientWs.send(JSON.stringify({ type: "status", status: "ready", voice: voiceName }));

    // Asynchronous receiver loop for incoming Gemini Live responses
    (async () => {
      try {
        for await (const message of session.receive()) {
          // 1. Audio and text parts
          const parts = message.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/")) {
              clientWs.send(
                JSON.stringify({
                  type: "audio",
                  data: part.inlineData.data
                })
              );
            }
            if (part.text) {
              clientWs.send(
                JSON.stringify({
                  type: "transcript",
                  role: "myraa",
                  text: part.text
                })
              );
            }
          }

          // 2. Interruption
          if (message.serverContent?.interrupted) {
            console.log("[Mobile Live] User interrupted Myraa.");
            clientWs.send(JSON.stringify({ type: "interrupted" }));
          }

          // 3. Turn complete
          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: "turnComplete" }));
          }

          // 4. Function & Tool Calls
          if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
              console.log("[Mobile Tool Call]:", fc.name, fc.args);

              if (fc.name === "playYouTubeMusic") {
                const query = fc.args?.query || "";
                let videoId = "";
                try {
                  const fetchRes = await fetch(
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
                    {
                      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
                    }
                  );
                  const html = await fetchRes.text();
                  const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                  if (match) videoId = match[1];
                } catch (e) {
                  console.error("YouTube query failure:", e.message);
                }

                clientWs.send(
                  JSON.stringify({
                    type: "youtube_play",
                    query,
                    videoId,
                    embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1` : ""
                  })
                );

                session.sendToolResponse({
                  functionResponses: [
                    {
                      name: fc.name,
                      id: fc.id,
                      response: {
                        output: {
                          result: videoId
                            ? `Playing '${query}' on YouTube player (Video ID: ${videoId})`
                            : `Searched YouTube for '${query}'`
                        }
                      }
                    }
                  ]
                });
              } else if (fc.name === "saveCustomMemory") {
                const category = fc.args?.category || "general";
                const text = fc.args?.text || "";
                if (text) {
                  const mList = loadMemories();
                  const newM = {
                    id: Math.random().toString(36).substring(2, 11),
                    category,
                    text,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  mList.push(newM);
                  saveMemories(mList);
                  clientWs.send(JSON.stringify({ type: "memory_sync", memories: mList }));
                  session.sendToolResponse({
                    functionResponses: [
                      {
                        name: fc.name,
                        id: fc.id,
                        response: { output: { result: `Memory captured and stored in brain: ${text}` } }
                      }
                    ]
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("[Mobile Live Stream Loop Error]:", err.message || err);
        clientWs.send(JSON.stringify({ type: "error", error: err.message || String(err) }));
      }
    })();

    // Handle messages from Mobile Web Client
    clientWs.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Audio chunk from phone microphone (PCM 16kHz)
        if (msg.type === "audio_chunk" && msg.data) {
          session.sendRealtimeInput({
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: msg.data
              }
            ]
          });
        } else if (msg.realtimeInput?.mediaChunks) {
          session.sendRealtimeInput(msg.realtimeInput);
        } else if (msg.type === "text" && msg.text) {
          session.sendRealtimeInput({
            content: [{ text: msg.text }]
          });
        }
      } catch (err) {
        console.error("[Mobile Live] Error sending input to Gemini:", err.message);
      }
    });

    clientWs.on("close", () => {
      console.log("[Mobile Live] Mobile client disconnected.");
      try {
        session.close();
      } catch {
        /* ignore */
      }
    });
  } catch (err) {
    console.error("[Mobile Live Init Failure]:", err.message || err);
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: `Gemini Connection Failed: ${err.message || err}`
      })
    );
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("\n==================================================");
  console.log("   🌸 MYRAA Mobile Voice Edition v2.0 Ready! 🌸");
  console.log(`   Local URL   : http://localhost:${PORT}`);
  console.log(`   Network URL : http://0.0.0.0:${PORT}`);
  console.log("==================================================\n");
});
