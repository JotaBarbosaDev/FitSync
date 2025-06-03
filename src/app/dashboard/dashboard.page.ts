import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PlanService } from '../services/plan.service';
import { TimerService } from '../services/timer.service';
import { User, Plan, WorkoutTimer } from '../models';

// Define interface para o histórico de workouts
interface WorkoutHistory {
  id: string;
  name: string;
  date: Date;
  duration: number;
  exercises: number;
  exerciseCount: number;
  calories: number;
  sets: number;
  muscleGroups: string[];
  primaryMuscle: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {
    currentUser: User | null = null;
  activePlan: Plan | null = null;
  plans: Plan[] = [];
  workoutTimer: WorkoutTimer = { totalTime: 0, isRunning: false, isPaused: false };
  recentWorkouts: WorkoutHistory[] = [];

  // Cache para valores estáveis durante o ciclo de vida do componente
  private _dailyMotivationalMessage: string | null = null;
  private _dailyTip: string | null = null;
  private _currentDate: string | null = null;

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
    this.router.navigate(['/tabs/lista']);
  }

  navigateToWorkout() {
    if (this.activePlan) {
      this.router.navigate(['/tabs/detalhe']);
    } else {
      this.showCreatePlanAlert();
    }
  }

  navigateToProfile() {
    this.router.navigate(['/tabs/dashboard']);
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
    }); await alert.present();
  }

  getUserFirstName(): string {
    if (this.currentUser?.name) {
      return this.currentUser.name.split(' ')[0];
    }
    return 'Usuário';
  }

  // Novos métodos para o dashboard moderno
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  getMotivationalMessage(): string {
    // Verificar se precisamos atualizar o cache (mudança de dia)
    const currentDate = new Date().toDateString();
    if (this._currentDate !== currentDate || this._dailyMotivationalMessage === null) {
      this._currentDate = currentDate;

      const messages = [
        'Pronto para superar seus limites hoje?',
        'Cada rep te deixa mais forte!',
        'Seus objetivos estão cada vez mais próximos',
        'Transforme suor em conquistas',
        'O único treino ruim é aquele que não acontece',
        'Seja a melhor versão de você mesmo'
      ];

      // Usar a data como seed para ter o mesmo resultado durante o dia
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const messageIndex = dayOfYear % messages.length;

      this._dailyMotivationalMessage = messages[messageIndex];
    }

    return this._dailyMotivationalMessage;
  }

  getWeeklyWorkouts(): number {
    // Simulação - em produção viria do serviço
    return 4;
  }

  getTotalWorkouts(): number {
    // Simulação - em produção viria do serviço
    return 47;
  }

  getStreakDays(): number {
    // Simulação - sequência de dias consecutivos
    return 7;
  }

  getCaloriesBurned(): number {
    // Simulação - calorias queimadas esta semana
    return 1240;
  }

  getPlanProgress(): number {
    if (!this.activePlan) return 0;
    // Simulação - progresso do plano atual
    return 68;
  }

  getMuscleGroupName(muscle: string): string {
    const muscleNames: { [key: string]: string } = {
      'chest': 'Peito',
      'back': 'Costas',
      'legs': 'Pernas',
      'shoulders': 'Ombros',
      'arms': 'Braços',
      'core': 'Core',
      'cardio': 'Cardio'
    };
    return muscleNames[muscle] || muscle;
  }

  getDailyTip(): string {
    // Verificar se precisamos atualizar o cache (mudança de dia)
    const currentDate = new Date().toDateString();
    if (this._currentDate !== currentDate || this._dailyTip === null) {
      this._currentDate = currentDate;

      const tips = [
        'Hidrate-se bem antes, durante e após o treino',
        'Aqueça sempre antes de iniciar os exercícios',
        'Mantenha uma postura correta durante todos os movimentos',
        'Descanse adequadamente entre as séries',
        'Varie seus treinos para evitar adaptação muscular',
        'A consistência é mais importante que a intensidade'
      ];

      // Usar a data como seed para ter o mesmo resultado durante o dia
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const tipIndex = (dayOfYear + 1) % tips.length; // +1 para diferir da mensagem motivacional

      this._dailyTip = tips[tipIndex];
    }

    return this._dailyTip;
  }

  formatWorkoutTime(): string {
    const totalSeconds = this.workoutTimer?.totalTime || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Métodos de navegação
  showProfile(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  startWorkout(): void {
    this.router.navigate(['/tabs/detalhe']);
  }

  quickStartWorkout(): void {
    this.router.navigate(['/tabs/detalhe']);
  }

  navigateToExercises(): void {
    this.router.navigate(['/tabs/lista']);
  }

  navigateToProgress(): void {
    this.router.navigate(['/tabs/workout-progress']);
  }

  navigateToNutrition(): void {
    this.router.navigate(['/nutrition']);
  }

  navigateToHistory(): void {
    this.router.navigate(['/history']);
  }

  startFirstWorkout(): void {
    this.router.navigate(['/tabs/detalhe']);
  }
}
