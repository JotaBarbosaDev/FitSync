import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NavigationService } from '../services/navigation.service';
import { User } from '../models';

/**
 * Página de Dashboard/Perfil do usuário
 * Exibe informações pessoais, estatísticas e configurações
 * Implementa navegação com parâmetros entre páginas
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {
  /** Usuário atualmente logado */
  currentUser: User | null = null;
  
  /** Array de subscriptions para evitar memory leaks */
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private alertController: AlertController,
    private navigationService: NavigationService
  ) { }

  /**
   * Inicialização do componente
   * Carrega dados do usuário e verifica parâmetros da rota
   */
  ngOnInit() {
    // Implementa requisito 5: Receber parâmetros de navegação
    this.checkRouteParameters();
    this.loadUserData();
  }

  /**
   * Cleanup ao destruir componente
   * Cancela todas as subscriptions ativas
   */
  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Verifica parâmetros recebidos de outras páginas (Requisito 5)
   * Processa ações baseadas nos parâmetros da URL
   */
  private checkRouteParameters() {
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['section']) {
        console.log('Navegação para seção específica:', params['section']);
        this.scrollToSection(params['section']);
      }
      
      if (params['fromPage']) {
        console.log('Usuário veio da página:', params['fromPage']);
        this.showWelcomeMessage(params['fromPage']);
      }
      
      if (params['edit'] === 'true') {
        console.log('Modo de edição ativado via parâmetro');
        this.enableEditMode();
      }
    });
  }

  /**
   * Navega para página de treinos com contexto (Requisito 5)
   * Passa informações do usuário atual como parâmetros
   */
  goToWorkouts() {
    this.navigationService.navigateToWorkoutWithParams(
      'user-workouts',
      'Meus Treinos',
      'dashboard'
    );
  }

  /**
   * Navega para estatísticas com parâmetros específicos (Requisito 5)
   */
  goToProgress() {
    this.navigationService.navigateToProgressWithParams(
      'dashboard',
      0, // Número padrão de treinos
      true
    );
  }

  async onRefresh(event: CustomEvent) {
    try {
      this.loadUserData();
    } catch (error) {
      console.error('Erro ao atualizar dados do dashboard:', error);
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  private loadUserData() {
    const userSub = this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.currentUser = user;
      } else {
        this.router.navigate(['/auth/login']);
      }
    });
    this.subscriptions.push(userSub);
  }

  getFirstName(): string {
    if (!this.currentUser?.name) return 'Utilizador';
    
    // Remove espaços extras e quebras de linha
    const cleanName = this.currentUser.name.trim().replace(/\s+/g, ' ');
    
    // Divide por espaços e pega a primeira palavra
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0];
    
    // Verifica se o primeiro nome não está vazio
    return firstName && firstName.length > 0 ? firstName : 'Utilizador';
  }

  getFitnessLevelText(): string {
    if (!this.currentUser?.fitnessLevel) return 'N/A';
    
    const levels = {
      'beginner': 'Iniciante',
      'intermediate': 'Intermédio',
      'advanced': 'Avançado'
    };
    
    return levels[this.currentUser.fitnessLevel] || 'N/A';
  }

  getGoalText(goal: string): string {
    const goalTexts: { [key: string]: string } = {
      'lose_weight': 'Perder Peso',
      'gain_muscle': 'Ganhar Músculo',
      'build_strength': 'Aumentar Força',
      'improve_endurance': 'Melhorar Resistência',
      'tone_body': 'Tonificar Corpo',
      'improve_flexibility': 'Melhorar Flexibilidade',
      'general_fitness': 'Fitness Geral'
    };
    
    return goalTexts[goal] || goal;
  }

  getHeight(): string {
    return this.currentUser?.height ? `${this.currentUser.height} cm` : 'N/A';
  }

  getWeight(): string {
    return this.currentUser?.weight ? `${this.currentUser.weight} kg` : 'N/A';
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
            await this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Rola para uma seção específica da página
   * @param section ID da seção para rolar
   */
  private scrollToSection(section: string) {
    // Implementação do scroll para seção específica
    console.log(`Rolando para seção: ${section}`);
  }

  /**
   * Exibe mensagem de boas-vindas baseada na página de origem
   * @param fromPage Página de onde o usuário veio
   */
  private showWelcomeMessage(fromPage: string) {
    console.log(`Bem-vindo! Você veio de: ${fromPage}`);
  }

  /**
   * Ativa modo de edição do perfil
   */
  private enableEditMode() {
    console.log('Modo de edição ativado');
  }
}
