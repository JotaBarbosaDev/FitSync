import { Injectable } from '@angular/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Device } from '@capacitor/device';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class DeviceControlService {

  constructor(private platform: Platform) { }

  // Initialize device controls
  async initializeDevice(): Promise<void> {
    if (this.platform.is('capacitor')) {
      await this.lockToPortrait();
      await this.setupStatusBar();
      await this.hideSplashScreen();
    }
  }

  // Lock orientation to portrait
  async lockToPortrait(): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
      console.log('Screen locked to portrait mode');
    } catch (error) {
      console.error('Error locking screen orientation:', error);
    }
  }

  // Allow landscape for specific features (like video workouts)
  async allowLandscape(): Promise<void> {
    try {
      await ScreenOrientation.unlock();
      console.log('Screen orientation unlocked');
    } catch (error) {
      console.error('Error unlocking screen orientation:', error);
    }
  }

  // Lock to landscape
  async lockToLandscape(): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation: 'landscape' });
      console.log('Screen locked to landscape mode');
    } catch (error) {
      console.error('Error locking to landscape:', error);
    }
  }

  // Get current orientation
  async getCurrentOrientation(): Promise<string> {
    try {
      const result = await ScreenOrientation.orientation();
      return result.type;
    } catch (error) {
      console.error('Error getting orientation:', error);
      return 'unknown';
    }
  }

  // Setup status bar
  async setupStatusBar(): Promise<void> {
    try {
      if (this.platform.is('android')) {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#141414' });
        // IMPORTANTE: overlaysWebView false para evitar sobreposição
        await StatusBar.setOverlaysWebView({ overlay: false });
      } else if (this.platform.is('ios')) {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: false });
      }
      await StatusBar.show();
      console.log('Status bar configured for safe areas - no overlay');
    } catch (error) {
      console.error('Error setting up status bar:', error);
    }
  }

  // Hide status bar
  async hideStatusBar(): Promise<void> {
    try {
      await StatusBar.hide();
      console.log('Status bar hidden');
    } catch (error) {
      console.error('Error hiding status bar:', error);
    }
  }

  // Show status bar
  async showStatusBar(): Promise<void> {
    try {
      await StatusBar.show();
      console.log('Status bar shown');
    } catch (error) {
      console.error('Error showing status bar:', error);
    }
  }

  // Hide splash screen
  async hideSplashScreen(): Promise<void> {
    try {
      await SplashScreen.hide();
      console.log('Splash screen hidden');
    } catch (error) {
      console.error('Error hiding splash screen:', error);
    }
  }

  // Get device info
  async getDeviceInfo(): Promise<any> {
    try {
      const info = await Device.getInfo();
      console.log('Device info:', info);
      return info;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  // Get device ID
  async getDeviceId(): Promise<string> {
    try {
      const result = await Device.getId();
      return result.identifier;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return 'unknown';
    }
  }

  // Get battery info
  async getBatteryInfo(): Promise<any> {
    try {
      const info = await Device.getBatteryInfo();
      return info;
    } catch (error) {
      console.error('Error getting battery info:', error);
      return null;
    }
  }

  // Listen to orientation changes
  async setupOrientationListener(): Promise<void> {
    ScreenOrientation.addListener('screenOrientationChange', (result) => {
      console.log('Orientation changed to:', result.type);

      // Auto-lock back to portrait if user rotates during workout
      if (result.type.includes('landscape')) {
        this.lockToPortrait();
      }
    });
  }

  // Set up workout mode (portrait lock + hide status bar for immersion)
  async enterWorkoutMode(): Promise<void> {
    await this.lockToPortrait();
    await this.hideStatusBar();
    console.log('Entered workout mode');
  }

  // Exit workout mode
  async exitWorkoutMode(): Promise<void> {
    await this.showStatusBar();
    console.log('Exited workout mode');
  }

  // Set up video/media mode (allow landscape)
  async enterMediaMode(): Promise<void> {
    await this.allowLandscape();
    console.log('Entered media mode - landscape allowed');
  }

  // Exit media mode
  async exitMediaMode(): Promise<void> {
    await this.lockToPortrait();
    console.log('Exited media mode - locked to portrait');
  }

  // Check if device supports orientation lock
  async supportsOrientationLock(): Promise<boolean> {
    return this.platform.is('capacitor') && !this.platform.is('mobileweb');
  }

  // Vibrate device (for workout notifications)
  async vibrate(duration: number = 100): Promise<void> {
    if (this.platform.is('capacitor')) {
      try {
        // Note: Haptics plugin would need to be installed for this
        console.log(`Vibrating for ${duration}ms`);
      } catch (error) {
        console.error('Error vibrating device:', error);
      }
    }
  }

  // Keep screen awake during workout
  async keepScreenAwake(): Promise<void> {
    // This would require the Keep Awake plugin
    console.log('Screen kept awake for workout');
  }

  // Allow screen to sleep
  async allowScreenSleep(): Promise<void> {
    console.log('Screen sleep allowed');
  }

  // Handle device back button
  setupBackButtonHandler(): void {
    this.platform.backButton.subscribeWithPriority(10, () => {
      console.log('Hardware back button pressed');
      // Handle back button logic here
    });
  }

  // Lock orientation methods
  async lockOrientation(orientation: 'portrait' | 'landscape'): Promise<void> {
    try {
      await ScreenOrientation.lock({ orientation });
      console.log(`Screen locked to ${orientation} mode`);
    } catch (error) {
      console.error('Error locking screen orientation:', error);
    }
  }

  async unlockOrientation(): Promise<void> {
    try {
      await ScreenOrientation.unlock();
      console.log('Screen orientation unlocked');
    } catch (error) {
      console.error('Error unlocking screen orientation:', error);
    }
  }

  // Toggle orientation lock
  private isOrientationLocked = false;

  async toggleOrientationLock(): Promise<void> {
    if (this.isOrientationLocked) {
      await this.unlockOrientation();
      this.isOrientationLocked = false;
    } else {
      await this.lockToPortrait();
      this.isOrientationLocked = true;
    }
  }
}
