/**
 * MYRAA Jio PC & Jio TV Set-Top Box Edition — Server
 * 
 * Optimized for:
 * - JioPC (Reliance Jio Cloud PC / ARM desktop)
 * - JioFiber / Jio Set-Top Box (Android TV via JioPages or Termux)
 * - Living room 10-foot TV experience with remote control D-pad navigation
 * - Direct YouTube TV streaming & high-fidelity voice AI
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

// Memory resolution
const sharedMemoriesFile = path.join(__dirname, "..", "shared", "memories.json");
const localMemoriesFile = path.join(__dirname, "memories.json");
const MEMORIES_PATH = fs.existsSync(sharedMemoriesFile) ? sharedMemoriesFile : localMemoriesFile;

// Secrets file for API key persistence
const SECRETS_FILE = path.join(__dirname, "secrets.json");

function getApiKey() {
  if (fs.existsSync(SECRETS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SECRETS_FILE, "utf-8"));
      if (data?.geminiApiKey?.trim()) return data.geminiApiKey.trim();
    } catch {
      /* ignore */
    }
  }
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "";
}

function saveApiKey(key) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify({ geminiApiKey: key.trim() }, null, 2), "utf-8");
}

function loadMemories() {
  try {
    if (fs.existsSync(MEMORIES_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORIES_PATH, "utf-8"));
    }
  } catch (err) {
    console.error("[Memory] Error loading memories:", err.message);
  }
  return [];
}

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// REST API
app.get("/api/config", (_req, res) => {
  res.json({ hasApiKey: Boolean(getApiKey()), platform: "JioPC / Jio TV Set-Top Box" });
});

app.post("/api/config/apikey", (req, res) => {
  const key = (req.body?.apiKey || "").trim();
  if (!key) return res.status(400).json({ error: "API key is required" });
  saveApiKey(key);
  res.json({ ok: true, hasApiKey: true });
});

app.get("/api/memories", (_req, res) => {
  res.json({ memories: loadMemories() });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "online", mode: "jiopc-tv-edition", timestamp: new Date().toISOString() });
});

// Fast YouTube resolver for Jio TV
app.get("/api/youtube/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) return res.status(400).json({ error: "Query required" });
  try {
    const fetchRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = await fetchRes.text();
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match && match[1]) {
      return res.json({ ok: true, videoId: match[1], url: `https://www.youtube.com/watch?v=${match[1]}` });
    }
    res.json({ ok: false, error: "No video found" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/live" });

wss.on("connection", async (clientWs) => {
  console.log("[JioPC Live] Client connected from TV / JioPC");
  const apiKey = getApiKey();

  if (!apiKey) {
    clientWs.send(JSON.stringify({ type: "error", message: "API_KEY_REQUIRED" }));
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const memories = loadMemories();
    const tvPersona =
      MYRAA_BASE_PROMPT +
      "\n\n[Jio PC & Jio TV Set-Top Box Context]\n" +
      "- You are running on TECH's Jio PC or Jio TV Set-Top Box in their living room on a large TV screen.\n" +
      "- Keep your responses energetic, warm, entertaining, and clear so they sound great on TV speakers.\n" +
      "- When asked to play songs, movies, or video clips ('Gana chalao', 'Play song', 'YouTube par chalao'), ALWAYS call the 'playYouTubeMusic' tool immediately.\n" +
      "- You can also adjust TV player volume ('tvVolume') and save custom memories.\n";

    const systemInstruction = formatSystemInstructionsWithMemories(tvPersona, memories);

    const session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
        },
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              {
                name: "playYouTubeMusic",
                description: "Searches YouTube and plays the best video or song immediately on the TV screen.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: { type: Type.STRING, description: "Song, artist, or video name (e.g. 'Kesariya', 'Lofi hip hop', 'Bollywood hits')." }
                  },
                  required: ["query"]
                }
              },
              {
                name: "tvVolume",
                description: "Adjust volume of the TV music player.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING, description: "'up', 'down', 'mute', or 'unmute'." }
                  },
                  required: ["action"]
                }
              },
              {
                name: "changeBackground",
                description: "Change the TV holographic background theme.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    theme: { type: Type.STRING, description: "Theme name: 'cyberpunk', 'nebula', 'matrix', 'sunset', 'midnight'." }
                  },
                  required: ["theme"]
                }
              }
            ]
          }
        ]
      }
    });

    clientWs.send(JSON.stringify({ type: "ready", model: "gemini-3.1-flash-live-preview", platform: "JioPC TV" }));

    // Forward upstream audio from Gemini to TV client
    (async () => {
      try {
        for await (const message of session.receive()) {
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
              clientWs.send(JSON.stringify({ type: "transcription", role: "model", text: part.text }));
            }
          }

          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: "interrupted" }));
          }

          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: "turnComplete" }));
          }

          // Handle function calls
          if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
              console.log("[TV Tool Call]:", fc.name, fc.args);

              if (fc.name === "playYouTubeMusic") {
                const q = fc.args?.query || "";
                let videoId = "";
                try {
                  const fetchRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
                  });
                  const html = await fetchRes.text();
                  const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                  if (match) videoId = match[1];
                } catch (e) {
                  console.error("YouTube search error:", e.message);
                }

                clientWs.send(JSON.stringify({ type: "tv_action", action: "play_youtube", query: q, videoId }));

                session.sendToolResponse({
                  functionResponses: [
                    {
                      name: fc.name,
                      id: fc.id,
                      response: { output: { result: videoId ? `Playing '${q}' on TV (ID: ${videoId})` : `Searched '${q}' on YouTube.` } }
                    }
                  ]
                });
              } else if (fc.name === "tvVolume") {
                const act = fc.args?.action || "up";
                clientWs.send(JSON.stringify({ type: "tv_action", action: "volume", value: act }));
                session.sendToolResponse({
                  functionResponses: [{ name: fc.name, id: fc.id, response: { output: { result: `TV volume set to ${act}.` } } }]
                });
              } else if (fc.name === "changeBackground") {
                const th = fc.args?.theme || "cyberpunk";
                clientWs.send(JSON.stringify({ type: "tv_action", action: "theme", value: th }));
                session.sendToolResponse({
                  functionResponses: [{ name: fc.name, id: fc.id, response: { output: { result: `TV theme changed to ${th}.` } } }]
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("[JioPC Live Stream Error]:", err.message);
      }
    })();

    // Handle incoming messages from TV client
    clientWs.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "audio_chunk" && msg.data) {
          session.sendRealtimeInput({
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: msg.data
              }
            ]
          });
        } else if (msg.type === "text" && msg.text) {
          session.sendRealtimeInput({
            content: [{ text: msg.text }]
          });
        }
      } catch (err) {
        console.error("Client message error:", err.message);
      }
    });

    clientWs.on("close", () => {
      console.log("[JioPC Live] TV client disconnected");
      try {
        session.close();
      } catch {
        /* ignore */
      }
    });
  } catch (err) {
    console.error("[JioPC Live Connect Error]:", err.message);
    clientWs.send(JSON.stringify({ type: "error", message: err.message }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n======================================================`);
  console.log(`  🌸 MYRAA Jio PC & Jio TV Set-Top Box Edition`);
  console.log(`======================================================`);
  console.log(`  Local URL (JioPC / Local):  http://localhost:${PORT}`);
  console.log(`  TV / Network URL:           http://0.0.0.0:${PORT}`);
  console.log(`  Open this URL inside JioPages on your Jio Set-Top Box!`);
  console.log(`======================================================\n`);
});
