package com.myraa.assistant;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.hardware.camera2.CameraManager;
import android.location.Location;
import android.location.LocationManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.provider.Settings;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.List;

public class DeviceManager {

    private final Context context;

    public DeviceManager(Context context) {
        this.context = context.getApplicationContext();
    }

    /**
     * Toggles flashlight on/off using CameraManager.
     */
    public boolean setFlashlight(boolean enable) {
        try {
            CameraManager cm = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
            if (cm != null) {
                String[] ids = cm.getCameraIdList();
                if (ids.length > 0) {
                    cm.setTorchMode(ids[0], enable);
                    return true;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    /**
     * Gets current GPS location as JSON string { "lat": ..., "lng": ... }.
     */
    public String getLocationJson() {
        JSONObject obj = new JSONObject();
        try {
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            if (lm != null) {
                Location loc = null;
                if (context.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                    if (loc == null) {
                        loc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    }
                }
                if (loc != null) {
                    obj.put("latitude", loc.getLatitude());
                    obj.put("longitude", loc.getLongitude());
                    obj.put("accuracy", loc.getAccuracy());
                    obj.put("altitude", loc.getAltitude());
                    obj.put("success", true);
                    return obj.toString();
                }
            }
            obj.put("success", false);
            obj.put("error", "Location unavailable or permission pending.");
        } catch (Exception e) {
            try {
                obj.put("success", false);
                obj.put("error", e.getMessage());
            } catch (Exception ignored) {}
        }
        return obj.toString();
    }

    /**
     * Sets media volume percentage (0 - 100).
     */
    public boolean setVolume(int percent) {
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                int target = (int) Math.round((percent / 100.0) * max);
                am.setStreamVolume(AudioManager.STREAM_MUSIC, target, AudioManager.FLAG_SHOW_UI);
                return true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    /**
     * Gets battery percentage and charging state.
     */
    public String getBatteryJson() {
        JSONObject obj = new JSONObject();
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = context.registerReceiver(null, ifilter);
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                     status == BatteryManager.BATTERY_STATUS_FULL;
                float pct = (level / (float) scale) * 100;
                obj.put("level", (int) pct);
                obj.put("isCharging", isCharging);
                obj.put("success", true);
                return obj.toString();
            }
        } catch (Exception e) {
            try {
                obj.put("success", false);
                obj.put("error", e.getMessage());
            } catch (Exception ignored) {}
        }
        return obj.toString();
    }

    /**
     * Vibrate device for durationMs.
     */
    public void vibrate(long durationMs) {
        try {
            Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(durationMs);
                }
            }
        } catch (Exception ignored) {}
    }

    /**
     * Lists all launchable installed apps on the device as JSON.
     */
    public String getInstalledAppsJson() {
        JSONArray arr = new JSONArray();
        try {
            PackageManager pm = context.getPackageManager();
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            for (ApplicationInfo app : apps) {
                if (pm.getLaunchIntentForPackage(app.packageName) != null) {
                    JSONObject item = new JSONObject();
                    item.put("name", pm.getApplicationLabel(app).toString());
                    item.put("package", app.packageName);
                    arr.put(item);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return arr.toString();
    }

    /**
     * Launches an app by package name or by display name (e.g. 'whatsapp', 'youtube').
     */
    public boolean launchApp(String nameOrPackage) {
        try {
            PackageManager pm = context.getPackageManager();
            String query = nameOrPackage.trim().toLowerCase();

            // Direct package match
            Intent intent = pm.getLaunchIntentForPackage(nameOrPackage);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return true;
            }

            // Search by label
            List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            for (ApplicationInfo app : apps) {
                String label = pm.getApplicationLabel(app).toString().toLowerCase();
                if (label.contains(query) || app.packageName.toLowerCase().contains(query)) {
                    Intent launchIntent = pm.getLaunchIntentForPackage(app.packageName);
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(launchIntent);
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    /**
     * Opens system Accessibility Settings screen so user can grant MYRAA touch control.
     */
    public void openAccessibilitySettings() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    /**
     * Opens system Overlay Settings screen so user can grant Draw Over Apps.
     */
    public void openOverlaySettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
    }
}
