package com.myraa.assistant;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.HttpsURLConnection;

public class MyraaNativeBridge {

    private final Context context;
    private final DeviceManager deviceManager;

    public MyraaNativeBridge(Context context) {
        this.context = context;
        this.deviceManager = new DeviceManager(context);
    }

    /**
     * Native Gemini API Key Tester.
     * Direct HTTPS request from Android Java with 0 CORS restrictions.
     */
    @JavascriptInterface
    public String testGeminiApiKey(String apiKey) {
        JSONObject res = new JSONObject();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            try {
                res.put("ok", false);
                res.put("error", "API Key khali hai. Kripya apna Google Gemini API Key paste karein.");
            } catch (Exception ignored) {}
            return res.toString();
        }

        String cleanKey = apiKey.trim().replace("\"", "").replace("'", "").replaceAll("\\s+", "");
        String[] testModels = new String[]{"gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"};

        long startTime = System.currentTimeMillis();
        String lastError = "";
        int lastCode = 0;

        for (String model : testModels) {
            try {
                URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + cleanKey);
                HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setDoOutput(true);

                String payload = "{\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":\"ping\"}]}]}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }

                int code = conn.getResponseCode();
                lastCode = code;

                if (code == 200) {
                    long elapsed = System.currentTimeMillis() - startTime;
                    res.put("ok", true);
                    res.put("model", model);
                    res.put("latencyMs", elapsed);
                    return res.toString();
                } else {
                    InputStream es = conn.getErrorStream();
                    if (es != null) {
                        BufferedReader r = new BufferedReader(new InputStreamReader(es, StandardCharsets.UTF_8));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = r.readLine()) != null) sb.append(line);
                        lastError = sb.toString();
                    }
                    if (code == 400 || code == 403) {
                        break;
                    }
                }
            } catch (Exception e) {
                lastError = e.getMessage() != null ? e.getMessage() : e.toString();
            }
        }

        try {
            res.put("ok", false);
            res.put("code", lastCode);
            String humanErr = lastError;
            try {
                JSONObject parsed = new JSONObject(lastError);
                if (parsed.has("error") && parsed.getJSONObject("error").has("message")) {
                    humanErr = parsed.getJSONObject("error").getString("message");
                }
            } catch (Exception ignored) {}
            res.put("error", humanErr != null && !humanErr.isEmpty() ? humanErr : "Network / Connection error. Check your internet connection.");
        } catch (Exception ignored) {}
        return res.toString();
    }

    /**
     * Native Gemini API Caller.
     * Makes HTTPS call to Gemini from Android with zero CORS / origin issues.
     */
    @JavascriptInterface
    public String callGeminiNative(String model, String apiKey, String payloadJson) {
        String cleanKey = apiKey != null ? apiKey.trim().replace("\"", "").replace("'", "").replaceAll("\\s+", "") : "";
        String[] fallbackModels = new String[]{
            (model != null && !model.isEmpty()) ? model : "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        };
        String lastResponse = "";
        for (String m : fallbackModels) {
            try {
                URL url = new URL("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + cleanKey);
                HttpsURLConnection conn = (HttpsURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setDoOutput(true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payloadJson.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }

                int code = conn.getResponseCode();
                InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                if (is != null) {
                    BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = r.readLine()) != null) sb.append(line);
                    lastResponse = sb.toString();
                    if (code == 200) {
                        return lastResponse;
                    }
                    if (code == 400 || code == 403) {
                        return lastResponse;
                    }
                }
            } catch (Exception e) {
                lastResponse = "{\"error\":{\"message\":\"" + (e.getMessage() != null ? e.getMessage().replace("\"", "'") : "Network error") + "\"}}";
            }
        }
        return lastResponse.isEmpty() ? "{\"error\":{\"message\":\"No response from Gemini API\"}}" : lastResponse;
    }

    @JavascriptInterface
    public boolean isAccessibilityActive() {
        return MyraaAccessibilityService.isServiceRunning();
    }

    @JavascriptInterface
    public void openAccessibilitySettings() {
        deviceManager.openAccessibilitySettings();
    }

    @JavascriptInterface
    public boolean isOverlayActive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }

    @JavascriptInterface
    public void openOverlaySettings() {
        deviceManager.openOverlaySettings();
    }

    @JavascriptInterface
    public boolean tap(float x, float y) {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        if (service != null) {
            return service.performTap(x, y);
        }
        return false;
    }

    @JavascriptInterface
    public boolean swipe(float x1, float y1, float x2, float y2, long durationMs) {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        if (service != null) {
            return service.performSwipe(x1, y1, x2, y2, durationMs);
        }
        return false;
    }

    @JavascriptInterface
    public boolean pressHome() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        return service != null && service.performHome();
    }

    @JavascriptInterface
    public boolean pressBack() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        return service != null && service.performBack();
    }

    @JavascriptInterface
    public boolean pressRecents() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        return service != null && service.performRecents();
    }

    @JavascriptInterface
    public boolean pullNotifications() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        return service != null && service.performNotifications();
    }

    @JavascriptInterface
    public boolean takeScreenshot() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        return service != null && service.performScreenshot();
    }

    @JavascriptInterface
    public boolean lockScreen() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        if (service != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return service.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN);
        }
        return false;
    }

    @JavascriptInterface
    public boolean showPowerDialog() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        if (service != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return service.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_POWER_DIALOG);
        }
        return false;
    }

    @JavascriptInterface
    public boolean toggleSplitScreen() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        if (service != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            return service.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_TOGGLE_SPLIT_SCREEN);
        }
        return false;
    }

    @JavascriptInterface
    public String getServerInfo() {
        JSONObject obj = new JSONObject();
        try {
            obj.put("running", MyraaLocalServer.isServerRunning());
            obj.put("port", MyraaLocalServer.DEFAULT_PORT);
            obj.put("ip", MyraaLocalServer.getLocalIpAddress());
            obj.put("localUrl", "http://localhost:" + MyraaLocalServer.DEFAULT_PORT);
            obj.put("wifiUrl", "http://" + MyraaLocalServer.getLocalIpAddress() + ":" + MyraaLocalServer.DEFAULT_PORT);
        } catch (Exception ignored) {}
        return obj.toString();
    }

    @JavascriptInterface
    public boolean sendWhatsApp(String contactOrNumber, String message) {
        return deviceManager.sendWhatsAppMessage(contactOrNumber, message);
    }

    @JavascriptInterface
    public boolean typeText(String text) {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        return service != null && service.typeText(text);
    }

    @JavascriptInterface
    public boolean clickByText(String text) {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        return service != null && service.clickByText(text);
    }

    @JavascriptInterface
    public String dumpScreenText() {
        MyraaAccessibilityService service = MyraaAccessibilityService.getInstance();
        if (service != null) {
            return service.dumpScreenText();
        }
        return "Accessibility Service inactive. Please enable in Settings.";
    }

    @JavascriptInterface
    public boolean openApp(String nameOrPackage) {
        return deviceManager.launchApp(nameOrPackage);
    }

    @JavascriptInterface
    public String getInstalledApps() {
        return deviceManager.getInstalledAppsJson();
    }

    @JavascriptInterface
    public String getLocation() {
        return deviceManager.getLocationJson();
    }

    @JavascriptInterface
    public boolean setFlashlight(boolean enable) {
        return deviceManager.setFlashlight(enable);
    }

    @JavascriptInterface
    public boolean setVolume(int percent) {
        return deviceManager.setVolume(percent);
    }

    @JavascriptInterface
    public String getBattery() {
        return deviceManager.getBatteryJson();
    }

    @JavascriptInterface
    public void vibrate(long durationMs) {
        deviceManager.vibrate(durationMs);
    }

    @JavascriptInterface
    public void speak(String text) {
        deviceManager.speak(text);
    }

    @JavascriptInterface
    public void stopSpeaking() {
        deviceManager.stopSpeaking();
    }

    @JavascriptInterface
    public void setVoiceSettings(float pitch, float rate) {
        deviceManager.setVoiceSettings(pitch, rate);
    }

    @JavascriptInterface
    public void openTtsSettings() {
        deviceManager.openTtsSettings();
    }

    @JavascriptInterface
    public void startFloatingBubble() {
        if (isOverlayActive()) {
            Intent intent = new Intent(context, MyraaOverlayService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } else {
            openOverlaySettings();
        }
    }

    @JavascriptInterface
    public void stopFloatingBubble() {
        Intent intent = new Intent(context, MyraaOverlayService.class);
        context.stopService(intent);
    }

    /**
     * Unified Tool Dispatcher for Gemini Live / Assistant tool calls.
     */
    @JavascriptInterface
    public String executeMobileTool(String toolName, String argsJson) {
        JSONObject res = new JSONObject();
        try {
            JSONObject args = new JSONObject(argsJson != null && !argsJson.isEmpty() ? argsJson : "{}");
            switch (toolName) {
                case "mobileTap":
                    float x = (float) args.optDouble("x", 500);
                    float y = (float) args.optDouble("y", 1000);
                    boolean tapOk = tap(x, y);
                    res.put("success", tapOk);
                    res.put("result", tapOk ? "Tapped at (" + x + ", " + y + ")" : "Tap failed. Is accessibility enabled?");
                    break;

                case "mobileSwipe":
                    float sx = (float) args.optDouble("startX", 500);
                    float sy = (float) args.optDouble("startY", 1500);
                    float ex = (float) args.optDouble("endX", 500);
                    float ey = (float) args.optDouble("endY", 500);
                    long duration = args.optLong("duration", 300);
                    boolean swipeOk = swipe(sx, sy, ex, ey, duration);
                    res.put("success", swipeOk);
                    res.put("result", swipeOk ? "Swiped successfully" : "Swipe failed. Is accessibility enabled?");
                    break;

                case "mobileHome":
                    res.put("success", pressHome());
                    res.put("result", "Navigated to Android Home Screen");
                    break;

                case "mobileBack":
                    res.put("success", pressBack());
                    res.put("result", "Pressed Android Back button");
                    break;

                case "mobileRecents":
                    res.put("success", pressRecents());
                    res.put("result", "Opened Recent Apps");
                    break;

                case "mobileNotifications":
                    res.put("success", pullNotifications());
                    res.put("result", "Pulled down Notifications panel");
                    break;

                case "mobileType":
                    String txt = args.optString("text", "");
                    boolean typeOk = typeText(txt);
                    res.put("success", typeOk);
                    res.put("result", typeOk ? "Typed: " + txt : "Typing failed. Make sure an input field is focused.");
                    break;

                case "mobileClickText":
                    String label = args.optString("text", "");
                    boolean clickOk = clickByText(label);
                    res.put("success", clickOk);
                    res.put("result", clickOk ? "Clicked element with text: " + label : "Element '" + label + "' not found on screen.");
                    break;

                case "mobileOpenApp":
                    String app = args.optString("name", args.optString("app", ""));
                    boolean openOk = openApp(app);
                    res.put("success", openOk);
                    res.put("result", openOk ? "Opened " + app : "Could not find or open " + app);
                    break;

                case "mobileReadScreen":
                    String screenContent = dumpScreenText();
                    res.put("success", true);
                    res.put("text", screenContent);
                    res.put("result", "Extracted visible screen elements.");
                    break;

                case "mobileLocation":
                    res.put("success", true);
                    res.put("location", new JSONObject(getLocation()));
                    res.put("result", "Retrieved GPS Location.");
                    break;

                case "sendWhatsAppMessage":
                    String who = args.optString("contactOrNumber", args.optString("target", ""));
                    String msg = args.optString("message", "");
                    boolean waOk = sendWhatsApp(who, msg);
                    res.put("success", waOk);
                    res.put("result", waOk ? "WhatsApp message dispatched to " + who : "Failed to open WhatsApp.");
                    break;

                case "mobileTorch":
                    boolean on = args.optBoolean("enable", true);
                    boolean torchOk = setFlashlight(on);
                    res.put("success", torchOk);
                    res.put("result", on ? "Flashlight turned ON" : "Flashlight turned OFF");
                    break;

                case "mobileVolume":
                    int pct = args.optInt("percent", 50);
                    boolean volOk = setVolume(pct);
                    res.put("success", volOk);
                    res.put("result", "Volume adjusted to " + pct + "%");
                    break;

                case "mobileBattery":
                    res.put("success", true);
                    res.put("battery", new JSONObject(getBattery()));
                    break;

                case "mobileScreenshot":
                    boolean scOk = takeScreenshot();
                    res.put("success", scOk);
                    res.put("result", scOk ? "Screenshot captured" : "Screenshot failed (requires Android 9+)");
                    break;

                case "mobileLockScreen":
                    boolean lkOk = lockScreen();
                    res.put("success", lkOk);
                    res.put("result", lkOk ? "Screen locked" : "Lock screen action failed");
                    break;

                case "mobilePowerMenu":
                    boolean pwOk = showPowerDialog();
                    res.put("success", pwOk);
                    res.put("result", pwOk ? "Power menu displayed" : "Power dialog action failed");
                    break;

                case "mobileVibrate":
                    long ms = args.optLong("duration", 200);
                    vibrate(ms);
                    res.put("success", true);
                    res.put("result", "Vibrated device");
                    break;

                default:
                    res.put("success", false);
                    res.put("error", "Unknown mobile tool: " + toolName);
            }
        } catch (Exception e) {
            try {
                res.put("success", false);
                res.put("error", e.getMessage());
            } catch (Exception ignored) {}
        }
        return res.toString();
    }
}
