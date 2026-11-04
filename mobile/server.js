/**
 * MYRAA Mobile Voice Edition — Core Server
 * Designed for Termux (Android), Cloud (Render/Railway), and local browser testing.
 * Zero desktop dependencies (no Python, no Electron, no Playwright).
 */

import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
import { MYRAA_BASE_PROMPT, formatSystemInstructionsWithMemories } from "../shared/persona.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (try mobile/.env first, then root .env)
const localEnv = path.join(__dirname, ".env");
const rootEnv = path.join(__dirname, "..", ".env");
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

// Memory resolution: try shared/memories.json, fallback to mobile/memories.json
const sharedMemoriesFile = path.join(__dirname, "..", "shared", "memories.json");
const localMemoriesFile = path.join(__dirname, "memories.json");
const MEMORIES_PATH = fs.existsSync(sharedMemoriesFile) ? sharedMemoriesFile : localMemoriesFile;

// Secrets storage for user-entered keys from mobile UI
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
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// REST API for mobile settings & status
app.get("/api/config", (_req, res) => {
  res.json({ hasApiKey: Boolean(getApiKey()) });
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
  res.json({ status: "online", mode: "mobile-voice", timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/live" });

wss.on("connection", async (clientWs) => {
  console.log("[Mobile Live] Client connected from mobile");
  const apiKey = getApiKey();

  if (!apiKey) {
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: "NO_API_KEY: Please add your Gemini API Key in Settings to talk with Myraa.",
      })
    );
    clientWs.close();
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    clientWs.send(JSON.stringify({ type: "status", status: "connecting_gemini" }));

    const memories = loadMemories();
    const systemInstruction = formatSystemInstructionsWithMemories(MYRAA_BASE_PROMPT, memories);

    const session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede", // Cute anime companion voice
            },
          },
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
      },
      callbacks: {
        onopen: () => {
          console.log("[Mobile Live] Gemini Live session connected successfully");
          clientWs.send(JSON.stringify({ type: "status", status: "ready" }));
        },
        onmessage: (msg) => {
          // Relay server audio chunks directly to client
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/")) {
                clientWs.send(
                  JSON.stringify({
                    type: "audio",
                    data: part.inlineData.data,
                  })
                );
              }
              if (part.text) {
                clientWs.send(
                  JSON.stringify({
                    type: "transcript",
                    role: "myraa",
                    text: part.text,
                  })
                );
              }
            }
          }

          if (msg.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: "interrupted" }));
          }
        },
        onclose: () => {
          console.log("[Mobile Live] Gemini Live session closed");
          clientWs.send(JSON.stringify({ type: "status", status: "session_closed" }));
        },
        onerror: (err) => {
          console.error("[Mobile Live] Gemini error:", err?.message || err);
          clientWs.send(JSON.stringify({ type: "error", error: err?.message || String(err) }));
        },
      },
    });

    clientWs.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.realtimeInput) {
          session.send(data);
        }
      } catch (err) {
        console.error("[Mobile Live] Error parsing incoming audio:", err.message);
      }
    });

    clientWs.on("close", () => {
      console.log("[Mobile Live] Mobile client disconnected");
      try {
        session.close();
      } catch {
        /* ignore */
      }
    });
  } catch (err) {
    console.error("[Mobile Live] Failed to initialize Gemini session:", err);
    clientWs.send(
      JSON.stringify({
        type: "error",
        error: `Gemini Connection Failed: ${err.message || err}`,
      })
    );
    clientWs.close();
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("==================================================");
  console.log("   🌸 MYRAA Mobile Voice Edition is Ready! 🌸");
  console.log(`   Local URL   : http://localhost:${PORT}`);
  console.log(`   Network URL : http://0.0.0.0:${PORT}`);
  console.log("==================================================");
});
