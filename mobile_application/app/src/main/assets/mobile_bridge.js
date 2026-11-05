/**
 * MYRAA Mobile Native Bridge Adapter
 * Safely wraps Android Java methods exposed via @JavascriptInterface `window.MyraaNative`.
 */
window.MobileBridge = {
  isAndroid: function() {
    return typeof window.MyraaNative !== 'undefined';
  },

  isAccessibilityActive: function() {
    if (this.isAndroid()) {
      try {
        return window.MyraaNative.isAccessibilityActive();
      } catch (e) {
        console.error('isAccessibilityActive failed:', e);
      }
    }
    return false;
  },

  openAccessibilitySettings: function() {
    if (this.isAndroid()) {
      window.MyraaNative.openAccessibilitySettings();
    } else {
      alert("Accessibility is only available when running on an Android device.");
    }
  },

  isOverlayActive: function() {
    if (this.isAndroid()) {
      try {
        return window.MyraaNative.isOverlayActive();
      } catch (e) {
        console.error('isOverlayActive failed:', e);
      }
    }
    return false;
  },

  openOverlaySettings: function() {
    if (this.isAndroid()) {
      window.MyraaNative.openOverlaySettings();
    } else {
      alert("Overlay permission is only available on Android.");
    }
  },

  startFloatingBubble: function() {
    if (this.isAndroid()) {
      window.MyraaNative.startFloatingBubble();
    }
  },

  stopFloatingBubble: function() {
    if (this.isAndroid()) {
      window.MyraaNative.stopFloatingBubble();
    }
  },

  // Super Touch & Navigation Actions
  tap: function(x, y) {
    if (this.isAndroid()) {
      return window.MyraaNative.tap(x, y);
    }
    console.log('[Dev Mock] Tap at', x, y);
    return true;
  },

  swipe: function(x1, y1, x2, y2, durationMs) {
    if (this.isAndroid()) {
      return window.MyraaNative.swipe(x1, y1, x2, y2, durationMs || 300);
    }
    console.log('[Dev Mock] Swipe from', x1, y1, 'to', x2, y2);
    return true;
  },

  pressHome: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.pressHome();
    }
    console.log('[Dev Mock] Press Home');
    return true;
  },

  pressBack: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.pressBack();
    }
    console.log('[Dev Mock] Press Back');
    return true;
  },

  pressRecents: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.pressRecents();
    }
    console.log('[Dev Mock] Press Recents');
    return true;
  },

  pullNotifications: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.pullNotifications();
    }
    console.log('[Dev Mock] Pull Notifications');
    return true;
  },

  typeText: function(text) {
    if (this.isAndroid()) {
      return window.MyraaNative.typeText(text);
    }
    console.log('[Dev Mock] Type Text:', text);
    return true;
  },

  clickByText: function(text) {
    if (this.isAndroid()) {
      return window.MyraaNative.clickByText(text);
    }
    console.log('[Dev Mock] Click text:', text);
    return true;
  },

  dumpScreenText: function() {
    if (this.isAndroid()) {
      return window.MyraaNative.dumpScreenText();
    }
    return "Mock Screen Content: WhatsApp, Messages, YouTube";
  },

  openApp: function(nameOrPackage) {
    if (this.isAndroid()) {
      return window.MyraaNative.openApp(nameOrPackage);
    }
    console.log('[Dev Mock] Open App:', nameOrPackage);
    return true;
  },

  getLocation: function() {
    if (this.isAndroid()) {
      try {
        return JSON.parse(window.MyraaNative.getLocation());
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true, latitude: 28.6139, longitude: 77.2090, accuracy: 10 };
  },

  setFlashlight: function(enable) {
    if (this.isAndroid()) {
      return window.MyraaNative.setFlashlight(enable);
    }
    console.log('[Dev Mock] Torch:', enable);
    return true;
  },

  setVolume: function(percent) {
    if (this.isAndroid()) {
      return window.MyraaNative.setVolume(percent);
    }
    console.log('[Dev Mock] Volume:', percent);
    return true;
  },

  getBattery: function() {
    if (this.isAndroid()) {
      try {
        return JSON.parse(window.MyraaNative.getBattery());
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true, level: 85, isCharging: false };
  },

  vibrate: function(durationMs) {
    if (this.isAndroid()) {
      window.MyraaNative.vibrate(durationMs || 100);
    }
  },

  executeMobileTool: function(toolName, args) {
    if (this.isAndroid()) {
      try {
        var resStr = window.MyraaNative.executeMobileTool(toolName, JSON.stringify(args || {}));
        return JSON.parse(resStr);
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    console.log('[Dev Mock] Execute mobile tool:', toolName, args);
    return { success: true, result: "Executed " + toolName + " (Dev Mock)" };
  }
};
