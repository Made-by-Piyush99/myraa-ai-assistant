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
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import java.util.Locale;
import java.util.List;
import java.util.Set;

public class DeviceManager {

    private final Context context;
    private TextToSpeech tts;
    private boolean isTtsReady = false;
    private float currentPitch = 1.22f;
    private float currentSpeed = 1.02f;

    public DeviceManager(Context context) {
        this.context = context.getApplicationContext();
        initTTS();
    }

    private void initTTS() {
        try {
            tts = new TextToSpeech(context, status -> {
                if (status == TextToSpeech.SUCCESS) {
                    configureBestVoice();
                    isTtsReady = true;
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void configureBestVoice() {
        if (tts == null) return;
        try {
            // First try Hindi (India)
            int res = tts.setLanguage(new Locale("hi", "IN"));
            if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.US);
            }

            // Find best high-quality / neural / female voice
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Set<Voice> voices = tts.getVoices();
                if (voices != null && !voices.isEmpty()) {
                    Voice selectedVoice = null;
                    // Prefer neural female Hindi/Indian voice
                    for (Voice v : voices) {
                        String name = v.getName().toLowerCase();
                        Locale loc = v.getLocale();
                        if (loc != null && (loc.getLanguage().equals("hi") || loc.getLanguage().equals("en"))) {
                            if (name.contains("female") || name.contains("hie") || name.contains("cfl") || name.contains("network") || name.contains("neural")) {
                                selectedVoice = v;
                                if (name.contains("hi") && (name.contains("network") || name.contains("hie"))) {
                                    break; // top pick
                                }
                            }
                        }
                    }
                    if (selectedVoice != null) {
                        tts.setVoice(selectedVoice);
                    }
                }
            }

            tts.setPitch(currentPitch);
            tts.setSpeechRate(currentSpeed);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void setVoiceSettings(float pitch, float rate) {
        this.currentPitch = pitch > 0 ? pitch : 1.22f;
        this.currentSpeed = rate > 0 ? rate : 1.02f;
        if (tts != null) {
            try {
                tts.setPitch(this.currentPitch);
                tts.setSpeechRate(this.currentSpeed);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void openTtsSettings() {
        try {
            Intent intent = new Intent("com.android.settings.TTS_SETTINGS");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
            } catch (Exception ignored) {}
        }
    }

    public void speak(String text) {
        if (text == null || text.trim().isEmpty()) return;
        if (tts == null) initTTS();
        try {
            if (tts != null) {
                tts.setPitch(currentPitch);
                tts.setSpeechRate(currentSpeed);
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "myraa_speech_" + System.currentTimeMillis());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void stopSpeaking() {
        try {
            if (tts != null) {
                tts.stop();
            }
        } catch (Exception ignored) {}
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
     * Sends a WhatsApp message autonomously.
     * Supports phone numbers or contact names with direct intent and web fallback.
     */
    public boolean sendWhatsAppMessage(String phoneOrContact, String message) {
        try {
            String text = message != null ? message : "";
            String target = phoneOrContact != null ? phoneOrContact.trim() : "";
            String digitsOnly = target.replaceAll("[^0-9+]", "");

            // If phone number with digits
            if (digitsOnly.length() >= 10) {
                if (!digitsOnly.startsWith("+") && digitsOnly.length() == 10) {
                    digitsOnly = "91" + digitsOnly; // Default India prefix
                }
                String url = "https://api.whatsapp.com/send?phone=" + digitsOnly + "&text=" + java.net.URLEncoder.encode(text, "UTF-8");
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                intent.setPackage("com.whatsapp");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return true;
            }

            // General WhatsApp send intent
            Intent sendIntent = new Intent(Intent.ACTION_SEND);
            sendIntent.setType("text/plain");
            sendIntent.setPackage("com.whatsapp");
            sendIntent.putExtra(Intent.EXTRA_TEXT, text);
            sendIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(sendIntent);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            try {
                String url = "https://api.whatsapp.com/send?text=" + java.net.URLEncoder.encode(message != null ? message : "", "UTF-8");
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                return true;
            } catch (Exception ignored) {}
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
