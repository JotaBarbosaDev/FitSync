import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { DeviceControlService } from './device-control.service';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'fitsync-theme';
  private currentTheme = new BehaviorSubject<Theme>('auto');
  public theme$ = this.currentTheme.asObservable();
  
  private _storage: Storage | null = null;

  constructor(
    private toastController: ToastController,
    private deviceControlService: DeviceControlService,
    private storage: Storage
  ) {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Inicializar o storage
      const storage = await this.storage.create();
      this._storage = storage;
      
      await this.initializeTheme();
    } catch (error) {
      console.error('ThemeService: Erro na inicialização:', error);
      // Fallback para localStorage
      this.initializeThemeFromLocalStorage();
    }
  }

  private async initializeTheme(): Promise<void> {
    try {
      let savedTheme: Theme | null = null;
      
      if (this._storage) {
        savedTheme = await this._storage.get(this.THEME_KEY);
      }
      
      // Fallback para localStorage se não encontrar no Ionic Storage
      if (!savedTheme) {
        savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
        
        // Migrar para Ionic Storage se encontrado no localStorage
        if (savedTheme && this._storage) {
          await this._storage.set(this.THEME_KEY, savedTheme);
          console.log('ThemeService: Tema migrado do localStorage para Ionic Storage');
        }
      }
      
      const theme = savedTheme || 'auto';
      this.setTheme(theme);
    } catch (error) {
      console.error('ThemeService: Erro ao carregar tema:', error);
      this.initializeThemeFromLocalStorage();
    }
  }

  private initializeThemeFromLocalStorage(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    const theme = savedTheme || 'auto';
    this.setTheme(theme);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.next(theme);
    this.saveTheme(theme);
    this.applyTheme(theme);
  }

  private async saveTheme(theme: Theme): Promise<void> {
    try {
      if (this._storage) {
        await this._storage.set(this.THEME_KEY, theme);
        console.log('ThemeService: Tema salvo no Ionic Storage');
      } else {
        // Fallback para localStorage
        localStorage.setItem(this.THEME_KEY, theme);
        console.log('ThemeService: Tema salvo no localStorage (fallback)');
      }
    } catch (error) {
      console.error('ThemeService: Erro ao salvar tema:', error);
      // Fallback final para localStorage
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  getCurrentTheme(): Theme {
    return this.currentTheme.value;
  }

  toggleTheme(): void {
    // Haptic feedback
    this.deviceControlService.vibrate(50);
    
    // Ativa transição suave
    this.enableThemeTransition();
    
    const current = this.getCurrentTheme();
    const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
    this.setTheme(next);
    
    // Mostra toast de confirmação
    this.showThemeToast(next);
  }

  private applyTheme(theme: Theme): void {
    const body = document.body;
    
    // Remove todas as classes de tema
    body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    
    // Adiciona a classe do tema atual
    body.classList.add(`theme-${theme}`);
    
    // Para tema automático, detecta preferência do sistema
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.toggle('dark', prefersDark);
    } else {
      body.classList.toggle('dark', theme === 'dark');
    }

    // Atualiza meta theme-color
    this.updateMetaThemeColor(theme);
  }

  private updateMetaThemeColor(theme: Theme): void {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const isDark = theme === 'dark' || 
        (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      metaThemeColor.setAttribute('content', isDark ? '#141414' : '#E6FE58');
    }
  }

  // Método para componentes verificarem se está no modo escuro
  isDarkMode(): boolean {
    const theme = this.getCurrentTheme();
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Escuta mudanças na preferência do sistema
  listenToSystemPreference(): void {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.getCurrentTheme() === 'auto') {
        this.applyTheme('auto');
      }
    });
  }

  // Getters para cores do tema atual
  getPrimaryColor(): string {
    return this.isDarkMode() ? '#E6FE58' : '#4CAF50';
  }

  getBackgroundColor(): string {
    return this.isDarkMode() ? '#141414' : '#ffffff';
  }

  getTextColor(): string {
    return this.isDarkMode() ? '#ffffff' : '#000000';
  }

  // Animação suave de transição entre temas
  enableThemeTransition(): void {
    const css = `
      *, *::before, *::after {
        transition: background-color 0.3s ease, 
                   color 0.3s ease, 
                   border-color 0.3s ease,
                   box-shadow 0.3s ease !important;
      }
    `;
    
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Remove a transição após completar
    setTimeout(() => {
      document.head.removeChild(style);
    }, 300);
  }

  // Mostra toast de confirmação de mudança de tema
  private async showThemeToast(theme: Theme): Promise<void> {
    const themeNames = {
      light: 'Tema Claro',
      dark: 'Tema Escuro',
      auto: 'Tema Automático'
    };

    const themeIcons = {
      light: 'sunny',
      dark: 'moon',
      auto: 'phone-portrait'
    };

    const toast = await this.toastController.create({
      message: `${themeNames[theme]} ativado`,
      duration: 2000,
      position: 'top',
      color: 'success',
      icon: themeIcons[theme],
      cssClass: 'theme-toast-custom'
    });

    await toast.present();
  }
}
