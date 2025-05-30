import { Component, Input } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-theme-toast',
  template: `
    <div class="theme-toast-content">
      <ion-icon [name]="themeIcon" class="theme-icon"></ion-icon>
      <div class="theme-text">
        <span class="theme-title">{{ themeTitle }}</span>
        <span class="theme-subtitle">{{ themeSubtitle }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./theme-toast.component.scss'],
  standalone: false
})
export class ThemeToastComponent {
  @Input() theme: 'light' | 'dark' | 'auto' = 'light';

  get themeIcon(): string {
    switch (this.theme) {
      case 'light': return 'sunny';
      case 'dark': return 'moon';
      case 'auto': return 'phone-portrait';
      default: return 'sunny';
    }
  }

  get themeTitle(): string {
    switch (this.theme) {
      case 'light': return 'Tema Claro';
      case 'dark': return 'Tema Escuro';
      case 'auto': return 'Tema Automático';
      default: return 'Tema Claro';
    }
  }

  get themeSubtitle(): string {
    switch (this.theme) {
      case 'light': return 'Interface clara ativada';
      case 'dark': return 'Interface escura ativada';
      case 'auto': return 'Segue preferência do sistema';
      default: return 'Interface clara ativada';
    }
  }

  static async present(toastController: ToastController, theme: 'light' | 'dark' | 'auto') {
    const component = new ThemeToastComponent();
    component.theme = theme;

    const toast = await toastController.create({
      message: `${component.themeTitle} - ${component.themeSubtitle}`,
      duration: 2000,
      position: 'top',
      color: 'success',
      icon: component.themeIcon,
      cssClass: 'theme-toast-custom'
    });

    await toast.present();
  }
}
