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
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {  currentUser: User | null = null;
  activePlan: Plan | null = null;
  plans: Plan[] = [];
  workoutTimer: WorkoutTimer = { totalTime: 0, isRunning: false, isPaused: false };
  recentWorkouts: any[] = [];
  
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
    }  }

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
    });    await alert.present();
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
    const messages = [
      'Pronto para superar seus limites hoje?',
      'Cada rep te deixa mais forte!',
      'Seus objetivos estão cada vez mais próximos',
      'Transforme suor em conquistas',
      'O único treino ruim é aquele que não acontece',
      'Seja a melhor versão de você mesmo'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
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
    const tips = [
      'Hidrate-se bem antes, durante e após o treino',
      'Aqueça sempre antes de iniciar os exercícios',
      'Mantenha uma postura correta durante todos os movimentos',
      'Descanse adequadamente entre as séries',
      'Varie seus treinos para evitar adaptação muscular',
      'A consistência é mais importante que a intensidade'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  // Métodos de navegação
  showProfile(): void {
    this.router.navigate(['/profile']);
  }

  startWorkout(): void {
    this.router.navigate(['/workout/start']);
  }

  quickStartWorkout(): void {
    this.router.navigate(['/workout/quick']);
  }

  navigateToExercises(): void {
    this.router.navigate(['/lista']);
  }

  navigateToProgress(): void {
    this.router.navigate(['/progress']);
  }

  navigateToNutrition(): void {
    this.router.navigate(['/nutrition']);
  }

  navigateToHistory(): void {
    this.router.navigate(['/history']);
  }

  startFirstWorkout(): void {
    this.router.navigate(['/workout/beginner']);
  }
}
