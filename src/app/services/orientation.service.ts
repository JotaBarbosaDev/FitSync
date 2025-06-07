import { Injectable } from '@angular/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class OrientationService {

  constructor(private platform: Platform) {}

  async lockToPortrait(): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        await ScreenOrientation.lock({ orientation: 'portrait' });
        console.log('Orientação bloqueada em portrait');
      }
    } catch (error) {
      console.error('Erro ao bloquear orientação:', error);
    }
  }

  async unlockOrientation(): Promise<void> {
    try {
      if (this.platform.is('capacitor')) {
        await ScreenOrientation.unlock();
        console.log('Orientação desbloqueada');
      }
    } catch (error) {
      console.error('Erro ao desbloquear orientação:', error);
    }
  }

  async getCurrentOrientation(): Promise<string> {
    try {
      if (this.platform.is('capacitor')) {
        const orientation = await ScreenOrientation.orientation();
        return orientation.type;
      }
      return 'portrait-primary';
    } catch (error) {
      console.error('Erro ao obter orientação:', error);
      return 'portrait-primary';
    }
  }

  // Listener para mudanças de orientação
  addOrientationChangeListener(callback: (orientation: string) => void): void {
    if (this.platform.is('capacitor')) {
      ScreenOrientation.addListener('screenOrientationChange', (orientation) => {
        console.log('Orientação mudou para:', orientation.type);
        callback(orientation.type);
      });
    }
  }
}
