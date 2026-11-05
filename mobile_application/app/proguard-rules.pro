# ProGuard rules for MYRAA Mobile Assistant
-keepattributes JavascriptInterface
-keepclassmembers class com.myraa.assistant.MyraaNativeBridge {
    <methods>;
}
-keep public class * extends android.accessibilityservice.AccessibilityService
-keep public class * extends android.app.Service
