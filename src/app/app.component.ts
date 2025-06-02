import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MenuController, AlertController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { DataService } from './services/data.service';
import { ThemeService } from './services/theme.service';
import { StorageService } from './services/storage.service';
import { JsonDataService } from './services/json-data.service';
import { DeviceControlService } from './services/device-control.service';
import { User } from './models';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isTabsPage = false;
  private authSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private themeService: ThemeService,
    private router: Router,
    private menuController: MenuController,
    private alertController: AlertController,
    private platform: Platform,
    private storageService: StorageService,
    private jsonDataService: JsonDataService,
    private deviceControlService: DeviceControlService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();
    
    // Initialize storage
    await this.storageService.init();
    
    // Initialize migrated services with Ionic Storage
    // Os serviços DataService, AuthService e ThemeService já se inicializam automaticamente
    
    // Initialize JSON data
    await this.jsonDataService.initializeAppData();
    
    // Initialize device controls
    await this.deviceControlService.initializeDevice();
    
    // Setup orientation listener
    await this.deviceControlService.setupOrientationListener();
    
    console.log('FitSync app initialized successfully');
  }

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Listen to route changes to detect tabs page
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isTabsPage = event.url.startsWith('/tabs');
      });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  async navigateTo(path: string) {
    await this.menuController.close();
    
    // Redirect to tabs for main app sections
    const tabsRoutes = {
      '/dashboard': '/tabs/home',
      '/home': '/tabs/home',
      '/plans': '/tabs/lista',
      '/workout': '/tabs/detalhe',
      '/progress': '/tabs/progresso',
      '/profile': '/tabs/dashboard'
    };
    
    const targetPath = tabsRoutes[path as keyof typeof tabsRoutes] || path;
    this.router.navigate([targetPath]);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Confirmar Logout',
      message: 'Tem certeza que deseja sair?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sair',
          handler: async () => {
            await this.menuController.close();
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      ]
    });
    await alert.present();
  }
}
