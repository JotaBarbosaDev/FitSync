import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PlanService } from '../services/plan.service';
import { TimerService } from '../services/timer.service';
import { User, Plan, WorkoutTimer } from '../models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  activePlan: Plan | null = null;
  plans: Plan[] = [];
  workoutTimer: WorkoutTimer = { totalTime: 0, isRunning: false, isPaused: false };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private planService: PlanService,
    private timerService: TimerService,
    private router: Router,
    private alertController: AlertController,
    private menuController: MenuController
  ) { }

  ngOnInit() {
    this.loadUserData();
    this.loadPlans();
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  ionViewWillEnter() {
    this.menuController.enable(true);
  }
  private loadUserData() {
    const sub = this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        if (!this.currentUser) {
          this.router.navigate(['/auth/login']);
        }
      },
      error: (error) => {
        console.error('Erro ao carregar dados do usuário:', error);
        this.router.navigate(['/auth/login']);
      }
    });
    this.subscriptions.push(sub);
  }

  private loadPlans() {
    const plansSub = this.planService.getPlans().subscribe(plans => {
      this.plans = plans;
      this.activePlan = this.planService.getActivePlan();
    });
    this.subscriptions.push(plansSub);
  }

  private setupSubscriptions() {
    const timerSub = this.timerService.workoutTimer$.subscribe(timer => {
      this.workoutTimer = timer;
    });
    this.subscriptions.push(timerSub);
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
          handler: () => {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  openMenu() {
    this.menuController.open();
  }

  navigateToPlans() {
    this.router.navigate(['/plans']);
  }

  navigateToWorkout() {
    if (this.activePlan) {
      this.router.navigate(['/workout']);
    } else {
      this.showCreatePlanAlert();
    }
  }

  navigateToProgress() {
    this.router.navigate(['/progress']);
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  async createQuickPlan() {
    const alert = await this.alertController.create({
      header: 'Criar Plano Rápido',
      message: 'Funcionalidade em desenvolvimento. Por enquanto, use a criação de planos personalizada.',
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showCreatePlanAlert() {
    const alert = await this.alertController.create({
      header: 'Nenhum Plano Ativo',
      message: 'Você precisa criar ou ativar um plano antes de começar a treinar.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Criar Plano',
          handler: () => {
            this.navigateToPlans();
          }
        }
      ]
    });
    await alert.present();
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Bom dia';
    } else if (hour < 18) {
      return 'Boa tarde';
    } else {
      return 'Boa noite';
    }
  }

  getMotivationalMessage(): string {
    const messages = [
      'Pronto para treinar hoje?',
      'Vamos conquistar seus objetivos!',
      'Cada treino te deixa mais forte!',
      'Hora de superar seus limites!',
      'Seu futuro eu agradece!',
      'Consistência é a chave do sucesso!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  formatWorkoutTime(): string {
    return this.timerService.formatTime(this.workoutTimer.totalTime);
  }

  getPlanProgress(): number {
    if (!this.activePlan) return 0;
    // Implementar cálculo de progresso do plano
    return 65; // Placeholder
  }

  getWeeklyWorkouts(): number {
    // Implementar cálculo de treinos da semana
    return 3; // Placeholder
  }

  getTotalWorkouts(): number {
    // Implementar cálculo total de treinos
    return 24; // Placeholder
  }
}
