package com.myraa.assistant;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;

public class MyraaNativeBridge {

    private final Context context;
    private final DeviceManager deviceManager;

    public MyraaNativeBridge(Context context) {
        this.context = context;
        this.deviceManager = new DeviceManager(context);
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
