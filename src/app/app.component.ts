import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MenuController, AlertController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { DataService } from './services/data.service';
import { ThemeService } from './services/theme.service';
import { StorageService } from './services/storage.service';
import { JsonDataService } from './services/json-data.service';
import { DeviceControlService } from './services/device-control.service';
import { WorkoutManagementService } from './services/workout-management.service';
import { NavigationService } from './services/navigation.service';
import { User } from './models';

/**
 * Componente principal da aplicação FitSync
 * Gerencia inicialização, navegação, menu e estado global
 * Coordena todos os serviços principais da aplicação
 */
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  /** Usuário atualmente logado na aplicação */
  currentUser: User | null = null;
  
  /** Indica se está na página de tabs (para controle do menu) */
  isTabsPage = false;
  
  /** Subscription para dados do usuário autenticado */
  private authSubscription?: Subscription;
  
  /** Subscription para mudanças de rota */
  private routerSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private themeService: ThemeService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private menuController: MenuController,
    private alertController: AlertController,
    private platform: Platform,
    private storageService: StorageService,
    private jsonDataService: JsonDataService,
    private deviceControlService: DeviceControlService,
    private workoutManagementService: WorkoutManagementService,
    private navigationService: NavigationService
  ) {
    // Inicia inicialização da aplicação
    this.initializeApp();
  }

  /**
   * Inicializa a aplicação FitSync
   * Configura storage, dispositivo, dados e sincronização
   * Garante que todos os serviços estejam prontos antes do uso
   */
  async initializeApp() {
    // Aguarda plataforma estar pronta (Ionic/Capacitor)
    await this.platform.ready();

    // Inicializa storage primeiro (necessário para outros serviços)
    await this.storageService.init();

    // Configura controles do dispositivo (StatusBar, orientação, etc.)
    await this.deviceControlService.initializeDevice();

    // Carrega dados JSON da aplicação
    await this.jsonDataService.initializeAppData();

    // Configura listener de orientação do dispositivo
    await this.deviceControlService.setupOrientationListener();

    // Sincroniza dados de treino para corrigir estatísticas
    console.log('🔄 Sincronizando dados de treino...');
    await this.workoutManagementService.synchronizeWorkoutData();

    console.log('✅ FitSync inicializada com sucesso');
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
      '/progress': '/tabs/workout-progress',
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
