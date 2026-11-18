package com.myraa.assistant;

import android.content.Context;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;

/**
 * MYRAA Local Autonomous REST & Control Server.
 * Automatically runs on port 3002 as soon as the app starts.
 * Exposes full Siri/Jarvis phone capture & remote controls over HTTP/JSON.
 */
public class MyraaLocalServer {

    private static final String TAG = "MyraaLocalServer";
    public static final int DEFAULT_PORT = 3002;

    private static ServerSocket serverSocket;
    private static Thread serverThread;
    private static boolean isRunning = false;
    private static Context appContext;
    private static DeviceManager deviceManager;
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    public static synchronized void startServer(Context context, int port) {
        if (isRunning) {
            Log.d(TAG, "Server already active on port " + DEFAULT_PORT);
            return;
        }

        appContext = context.getApplicationContext();
        deviceManager = new DeviceManager(appContext);

        serverThread = new Thread(() -> {
            try {
                serverSocket = new ServerSocket(port);
                serverSocket.setReuseAddress(true);
                isRunning = true;
                Log.i(TAG, "==================================================");
                Log.i(TAG, "   🌸 MYRAA Mobile Jarvis Server Ready! 🌸");
                Log.i(TAG, "   Port: " + port);
                Log.i(TAG, "   WiFi IP: http://" + getLocalIpAddress() + ":" + port);
                Log.i(TAG, "   Localhost: http://localhost:" + port);
                Log.i(TAG, "==================================================");

                while (isRunning && !serverSocket.isClosed()) {
                    try {
                        Socket clientSocket = serverSocket.accept();
                        new Thread(() -> handleClient(clientSocket)).start();
                    } catch (Exception e) {
                        if (!isRunning) break;
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to start server on port " + port, e);
                isRunning = false;
            }
        });
        serverThread.setName("Myraa-Server-3002");
        serverThread.setDaemon(true);
        serverThread.start();
    }

    public static synchronized void stopServer() {
        isRunning = false;
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (Exception ignored) {}
    }

    public static boolean isServerRunning() {
        return isRunning;
    }

    public static String getLocalIpAddress() {
        try {
            if (appContext != null) {
                WifiManager wm = (WifiManager) appContext.getSystemService(Context.WIFI_SERVICE);
                if (wm != null && wm.isWifiEnabled()) {
                    int ipInt = wm.getConnectionInfo().getIpAddress();
                    if (ipInt != 0) {
                        return (ipInt & 0xFF) + "." + ((ipInt >> 8) & 0xFF) + "." + ((ipInt >> 16) & 0xFF) + "." + ((ipInt >> 24) & 0xFF);
                    }
                }
            }
            for (Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces(); en.hasMoreElements();) {
                NetworkInterface intf = en.nextElement();
                for (Enumeration<InetAddress> enumIpAddr = intf.getInetAddresses(); enumIpAddr.hasMoreElements();) {
                    InetAddress inetAddress = enumIpAddr.nextElement();
                    if (!inetAddress.isLoopbackAddress() && inetAddress instanceof Inet4Address) {
                        return inetAddress.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {}
        return "127.0.0.1";
    }

    private static void handleClient(Socket socket) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
             OutputStream output = socket.getOutputStream()) {

            String requestLine = reader.readLine();
            if (requestLine == null) return;

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;

            String method = parts[0].toUpperCase();
            String path = parts[1];

            // Read headers to get Content-Length
            int contentLength = 0;
            String headerLine;
            while ((headerLine = reader.readLine()) != null && !headerLine.isEmpty()) {
                if (headerLine.toLowerCase().startsWith("content-length:")) {
                    contentLength = Integer.parseInt(headerLine.substring(15).trim());
                }
            }

            // Read request body if present
            StringBuilder body = new StringBuilder();
            if (contentLength > 0) {
                char[] charBuf = new char[contentLength];
                int read = 0;
                while (read < contentLength) {
                    int r = reader.read(charBuf, read, contentLength - read);
                    if (r == -1) break;
                    read += r;
                }
                body.append(charBuf, 0, read);
            }

            // Handle OPTIONS for CORS pre-flight
            if ("OPTIONS".equals(method)) {
                sendResponse(output, 200, "OK", "text/plain", "");
                return;
            }

            routeRequest(method, path, body.toString(), output);

        } catch (Exception e) {
            Log.e(TAG, "Client handle error", e);
        } finally {
            try { socket.close(); } catch (Exception ignored) {}
        }
    }

    private static void routeRequest(String method, String path, String bodyStr, OutputStream out) throws Exception {
        JSONObject body = new JSONObject();
        if (bodyStr != null && !bodyStr.trim().isEmpty()) {
            try { body = new JSONObject(bodyStr); } catch (Exception ignored) {}
        }

        MyraaAccessibilityService access = MyraaAccessibilityService.getInstance();

        // 1. Health / Server Info
        if (path.equals("/api/health") || path.equals("/api/status")) {
            JSONObject res = new JSONObject();
            res.put("ok", true);
            res.put("status", "online");
            res.put("service", "MYRAA Autonomous AI Assistant");
            res.put("port", DEFAULT_PORT);
            res.put("ip", getLocalIpAddress());
            res.put("accessibilityActive", access != null);
            res.put("device", android.os.Build.MODEL);
            res.put("androidVersion", android.os.Build.VERSION.RELEASE);
            sendResponse(out, 200, "OK", "application/json", res.toString());
            return;
        }

        // 2. Battery
        if (path.equals("/api/battery")) {
            String bat = deviceManager.getBatteryJson();
            sendResponse(out, 200, "OK", "application/json", bat);
            return;
        }

        // 3. Location
        if (path.equals("/api/location")) {
            String loc = deviceManager.getLocationJson();
            sendResponse(out, 200, "OK", "application/json", loc);
            return;
        }

        // 4. Installed Apps
        if (path.equals("/api/apps")) {
            String apps = deviceManager.getInstalledAppsJson();
            sendResponse(out, 200, "OK", "application/json", apps);
            return;
        }

        // 5. Screen Capture & OCR Dump
        if (path.equals("/api/screen")) {
            JSONObject res = new JSONObject();
            if (access != null) {
                res.put("ok", true);
                res.put("screenText", access.dumpScreenText());
            } else {
                res.put("ok", false);
                res.put("error", "Accessibility Service inactive. Grant in Settings.");
            }
            sendResponse(out, 200, "OK", "application/json", res.toString());
            return;
        }

        // 6. Speak (TTS)
        if (path.equals("/api/speak") && "POST".equals(method)) {
            String text = body.optString("text", "");
            if (!text.isEmpty()) {
                mainHandler.post(() -> deviceManager.speak(text));
            }
            JSONObject res = new JSONObject();
            res.put("ok", true);
            res.put("spoken", text);
            sendResponse(out, 200, "OK", "application/json", res.toString());
            return;
        }

        // 7. Tap (Touch)
        if (path.equals("/api/tap") && "POST".equals(method)) {
            float x = (float) body.optDouble("x", 500);
            float y = (float) body.optDouble("y", 1000);
            boolean success = false;
            if (access != null) {
                success = access.performTap(x, y);
            }
            JSONObject res = new JSONObject();
            res.put("ok", success);
            res.put("action", "tap");
            res.put("coordinates", "(" + x + ", " + y + ")");
            sendResponse(out, 200, "OK", "application/json", res.toString());
            return;
        }

        // 8. Swipe
        if (path.equals("/api/swipe") && "POST".equals(method)) {
            float sx = (float) body.optDouble("startX", 500);
            float sy = (float) body.optDouble("startY", 1500);
            float ex = (float) body.optDouble("endX", 500);
            float ey = (float) body.optDouble("endY", 500);
            long dur = body.optLong("duration", 300);
            boolean success = false;
            if (access != null) {
                success = access.performSwipe(sx, sy, ex, ey, dur);
            }
            JSONObject res = new JSONObject();
            res.put("ok", success);
            res.put("action", "swipe");
            sendResponse(out, 200, "OK", "application/json", res.toString());
            return;
        }

        // 9. Home / Back / Recents / Screenshot
        if (path.equals("/api/home") && "POST".equals(method)) {
            boolean ok = access != null && access.performHome();
            sendActionResponse(out, "home", ok);
            return;
        }
        if (path.equals("/api/back") && "POST".equals(method)) {
            boolean ok = access != null && access.performBack();
            sendActionResponse(out, "back", ok);
            return;
        }
        if (path.equals("/api/recents") && "POST".equals(method)) {
            boolean ok = access != null && access.performRecents();
            sendActionResponse(out, "recents", ok);
            return;
        }
        if (path.equals("/api/screenshot") && "POST".equals(method)) {
            boolean ok = access != null && access.performScreenshot();
            sendActionResponse(out, "screenshot", ok);
            return;
        }

        // 10. Click Text / Type Text
        if (path.equals("/api/click-text") && "POST".equals(method)) {
            String text = body.optString("text", "");
            boolean ok = access != null && access.clickByText(text);
            sendActionResponse(out, "clickText: " + text, ok);
            return;
        }
        if (path.equals("/api/type-text") && "POST".equals(method)) {
            String text = body.optString("text", "");
            boolean ok = access != null && access.typeText(text);
            sendActionResponse(out, "typeText", ok);
            return;
        }

        // 11. Launch App
        if (path.equals("/api/open-app") && "POST".equals(method)) {
            String appName = body.optString("name", "youtube");
            boolean ok = deviceManager.launchApp(appName);
            sendActionResponse(out, "openApp: " + appName, ok);
            return;
        }

        // 12. Flashlight
        if (path.equals("/api/flashlight") && "POST".equals(method)) {
            boolean enable = body.optBoolean("enable", true);
            boolean ok = deviceManager.setFlashlight(enable);
            sendActionResponse(out, "flashlight: " + enable, ok);
            return;
        }

        // 13. Send WhatsApp Message
        if (path.equals("/api/whatsapp") && "POST".equals(method)) {
            String to = body.optString("to", body.optString("contact", ""));
            String msg = body.optString("message", body.optString("text", "Hello"));
            boolean ok = deviceManager.sendWhatsAppMessage(to, msg);
            sendActionResponse(out, "sendWhatsApp: " + to, ok);
            return;
        }

        // 13. Universal Command Dispatcher (Jarvis / Siri style)
        if (path.equals("/api/command") && "POST".equals(method)) {
            String cmd = body.optString("command", "").toLowerCase().trim();
            JSONObject res = new JSONObject();
            res.put("ok", true);
            res.put("command", cmd);

            if (cmd.contains("youtube")) {
                deviceManager.launchApp("com.google.android.youtube");
                res.put("result", "Opened YouTube");
            } else if (cmd.contains("whatsapp")) {
                deviceManager.launchApp("com.whatsapp");
                res.put("result", "Opened WhatsApp");
            } else if (cmd.contains("instagram")) {
                deviceManager.launchApp("com.instagram.android");
                res.put("result", "Opened Instagram");
            } else if (cmd.contains("torch on") || cmd.contains("flashlight on")) {
                deviceManager.setFlashlight(true);
                res.put("result", "Flashlight ON");
            } else if (cmd.contains("torch off") || cmd.contains("flashlight off")) {
                deviceManager.setFlashlight(false);
                res.put("result", "Flashlight OFF");
            } else if (cmd.contains("home")) {
                if (access != null) access.performHome();
                res.put("result", "Navigated Home");
            } else if (cmd.contains("back")) {
                if (access != null) access.performBack();
                res.put("result", "Navigated Back");
            } else if (cmd.contains("screenshot")) {
                if (access != null) access.performScreenshot();
                res.put("result", "Captured Screenshot");
            } else {
                res.put("result", "Command received and logged.");
            }
            sendResponse(out, 200, "OK", "application/json", res.toString());
            return;
        }

        // Root Dashboard / HTML Status Page
        if (path.equals("/") || path.equals("/index.html")) {
            String html = "<!DOCTYPE html><html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width, initial-scale=1'/>" +
                    "<title>MYRAA AI — Local Server :3002</title>" +
                    "<style>" +
                    "body{font-family:-apple-system,sans-serif;background:#060814;color:#f3f4f6;padding:24px;margin:0;}" +
                    ".card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);padding:20px;border-radius:16px;max-width:540px;margin:0 auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);}" +
                    "h1{color:#c084fc;font-size:1.4rem;margin-top:0;display:flex;align-items:center;gap:10px;}" +
                    ".badge{background:#10b981;color:#fff;font-size:0.75rem;padding:4px 8px;border-radius:6px;}" +
                    "button{background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:white;border:none;padding:10px 16px;border-radius:10px;font-weight:600;margin:6px 4px 6px 0;cursor:pointer;}" +
                    "pre{background:#0a0e20;padding:12px;border-radius:8px;font-size:0.8rem;overflow-x:auto;color:#38bdf8;}" +
                    "</style></head><body>" +
                    "<div class='card'>" +
                    "<h1>🌸 MYRAA Mobile Jarvis Server <span class='badge'>PORT 3002 ONLINE</span></h1>" +
                    "<p>Native autonomous assistant server running directly on Android device.</p>" +
                    "<p><strong>Device IP:</strong> http://" + getLocalIpAddress() + ":3002</p>" +
                    "<p><strong>Accessibility:</strong> " + (access != null ? "🟢 ACTIVE (Full Touch & Control)" : "🔴 INACTIVE") + "</p>" +
                    "<h3>Quick Device Controls:</h3>" +
                    "<div>" +
                    "<button onclick=\"fetch('/api/home',{method:'POST'})\">🏠 Home</button> " +
                    "<button onclick=\"fetch('/api/back',{method:'POST'})\">🔙 Back</button> " +
                    "<button onclick=\"fetch('/api/open-app',{method:'POST',body:JSON.stringify({name:'youtube'})})\">▶️ YouTube</button> " +
                    "<button onclick=\"fetch('/api/flashlight',{method:'POST',body:JSON.stringify({enable:true})})\">🔦 Flashlight ON</button> " +
                    "<button onclick=\"fetch('/api/flashlight',{method:'POST',body:JSON.stringify({enable:false})})\">🌑 Flashlight OFF</button> " +
                    "<button onclick=\"fetch('/api/screenshot',{method:'POST'})\">📸 Screenshot</button>" +
                    "</div>" +
                    "<h3>Active Endpoints:</h3>" +
                    "<pre>GET  /api/health\nGET  /api/screen\nGET  /api/battery\nGET  /api/location\nGET  /api/apps\nPOST /api/command\nPOST /api/speak\nPOST /api/tap\nPOST /api/swipe\nPOST /api/open-app</pre>" +
                    "</div></body></html>";
            sendResponse(out, 200, "OK", "text/html", html);
            return;
        }

        // 404 Fallback
        sendResponse(out, 404, "Not Found", "application/json", "{\"error\":\"Endpoint not found\"}");
    }

    private static void sendActionResponse(OutputStream out, String action, boolean ok) throws Exception {
        JSONObject res = new JSONObject();
        res.put("ok", ok);
        res.put("action", action);
        sendResponse(out, ok ? 200 : 500, ok ? "OK" : "Error", "application/json", res.toString());
    }

    private static void sendResponse(OutputStream out, int statusCode, String statusText, String contentType, String content) throws Exception {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        String header = "HTTP/1.1 " + statusCode + " " + statusText + "\r\n" +
                "Content-Type: " + contentType + "; charset=utf-8\r\n" +
                "Content-Length: " + bytes.length + "\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                "Access-Control-Allow-Headers: Content-Type, Authorization\r\n" +
                "Connection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.UTF_8));
        out.write(bytes);
        out.flush();
    }
}
