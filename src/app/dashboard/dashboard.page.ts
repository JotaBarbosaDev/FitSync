import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PlanService } from '../services/plan.service';
import { TimerService } from '../services/timer.service';
import { StorageService } from '../services/storage.service';
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

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

interface PersonalRecord {
  id: string;
  title: string;
  value: string;
  icon: string;
  date: Date;
}

interface UserStats {
  workouts: number;
  totalMinutes: number;
  totalCalories: number;
  achievements: number;
}

interface WeeklyStats {
  workouts: number;
  minutes: number;
}

interface UserPreferences {
  notifications: boolean;
  darkMode: boolean;
  reminderTime: string;
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
  
  // Novas propriedades para o perfil melhorado
  userProfile: any = {};
  userLevel = 1;
  currentStreak = 0;
  totalStats: UserStats = { workouts: 0, totalMinutes: 0, totalCalories: 0, achievements: 0 };
  weeklyStats: WeeklyStats = { workouts: 0, minutes: 0 };
  weeklyProgress = 0;
  userAchievements: Achievement[] = [];
  personalRecords: PersonalRecord[] = [];
  preferences: UserPreferences = { notifications: true, darkMode: false, reminderTime: '' };

  // Cache para valores estáveis durante o ciclo de vida do componente
  private _dailyMotivationalMessage: string | null = null;
  private _dailyTip: string | null = null;
  private _currentDate: string | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private planService: PlanService,
    private timerService: TimerService,
    private storageService: StorageService,
    private router: Router,
    private alertController: AlertController,
    private menuController: MenuController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.loadUserData();
    this.loadPlans();
    this.setupSubscriptions();
    this.loadProfileData();
    this.loadUserStats();
    this.loadAchievements();
    this.loadPersonalRecords();
    this.loadPreferences();
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

  // Novos métodos para o perfil melhorado

  async loadProfileData() {
    try {
      const profile = await this.storageService.get('userProfile');
      if (profile) {
        this.userProfile = profile as any;
      }

      // Calcular nível do usuário baseado nos treinos completados
      const sessions = await this.storageService.get('workoutSessions') || [];
      const totalWorkouts = Array.isArray(sessions) ? sessions.length : 0;
      this.userLevel = Math.floor(totalWorkouts / 10) + 1; // Nível aumenta a cada 10 treinos

      // Calcular streak atual
      await this.calculateCurrentStreak();
    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
    }
  }

  async loadUserStats() {
    try {
      const sessions = await this.storageService.get('workoutSessions') || [];
      const achievements = await this.storageService.get('achievements') || [];

      if (Array.isArray(sessions)) {
        this.totalStats.workouts = sessions.length;
        this.totalStats.totalMinutes = sessions.reduce((total: number, session: any) => {
          return total + (session.duration || 0);
        }, 0);
        this.totalStats.totalCalories = sessions.reduce((total: number, session: any) => {
          return total + (session.caloriesBurned || 0);
        }, 0);
      }

      this.totalStats.achievements = Array.isArray(achievements) ? achievements.length : 0;

      // Calcular estatísticas semanais
      await this.calculateWeeklyStats();
    } catch (error) {
      console.error('Erro ao carregar estatísticas do usuário:', error);
    }
  }

  async calculateWeeklyStats() {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const sessions = await this.storageService.get('workoutSessions') || [];
      const thisWeekSessions = Array.isArray(sessions) ? sessions.filter((session: any) => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startOfWeek;
      }) : [];

      this.weeklyStats.workouts = thisWeekSessions.length;
      this.weeklyStats.minutes = thisWeekSessions.reduce((total: number, session: any) => {
        return total + (session.duration || 0);
      }, 0);

      // Calcular progresso semanal (meta de 4 treinos)
      this.weeklyProgress = Math.min((this.weeklyStats.workouts / 4) * 100, 100);
    } catch (error) {
      console.error('Erro ao calcular estatísticas semanais:', error);
    }
  }

  async loadAchievements() {
    try {
      const achievements = await this.storageService.get('achievements') || [];
      if (Array.isArray(achievements)) {
        this.userAchievements = achievements
          .sort((a: any, b: any) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
          .slice(0, 5) // Mostrar apenas as 5 mais recentes
          .map((achievement: any) => ({
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon || '🏆',
            earnedAt: new Date(achievement.earnedAt)
          }));
      }
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error);
      this.userAchievements = [];
    }
  }

  async loadPersonalRecords() {
    try {
      const sessions = await this.storageService.get('workoutSessions') || [];
      if (!Array.isArray(sessions) || sessions.length === 0) {
        this.personalRecords = [];
        return;
      }

      // Calcular recordes baseados nos dados disponíveis
      const records: PersonalRecord[] = [];

      // Maior duração de treino
      const longestWorkout = sessions.reduce((max: any, session: any) => {
        return (session.duration || 0) > (max.duration || 0) ? session : max;
      }, sessions[0]);

      if (longestWorkout && longestWorkout.duration) {
        records.push({
          id: 'longest-workout',
          title: 'Treino Mais Longo',
          value: `${longestWorkout.duration} minutos`,
          icon: 'time',
          date: new Date(longestWorkout.startTime)
        });
      }

      // Maior queima de calorias
      const highestCalories = sessions.reduce((max: any, session: any) => {
        return (session.caloriesBurned || 0) > (max.caloriesBurned || 0) ? session : max;
      }, sessions[0]);

      if (highestCalories && highestCalories.caloriesBurned) {
        records.push({
          id: 'highest-calories',
          title: 'Maior Queima de Calorias',
          value: `${highestCalories.caloriesBurned} kcal`,
          icon: 'flame',
          date: new Date(highestCalories.startTime)
        });
      }

      this.personalRecords = records;
    } catch (error) {
      console.error('Erro ao carregar recordes pessoais:', error);
      this.personalRecords = [];
    }
  }

  async loadPreferences() {
    try {
      const prefs = await this.storageService.get('userPreferences');
      if (prefs) {
        this.preferences = { ...this.preferences, ...(prefs as any) };
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    }
  }

  async calculateCurrentStreak() {
    try {
      const sessions = await this.storageService.get('workoutSessions') || [];
      if (!Array.isArray(sessions) || sessions.length === 0) {
        this.currentStreak = 0;
        return;
      }

      // Ordenar sessões por data (mais recente primeiro)
      const sortedSessions = sessions.sort((a: any, b: any) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedSessions.length; i++) {
        const sessionDate = new Date(sortedSessions[i].startTime);
        sessionDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
        } else if (daysDiff > streak) {
          break;
        }
      }

      this.currentStreak = streak;
    } catch (error) {
      console.error('Erro ao calcular streak:', error);
      this.currentStreak = 0;
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatWorkoutTime(): string {
    const minutes = this.totalStats.totalMinutes;
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }

  startWorkout() {
    this.router.navigate(['/tabs/home']);
  }

  quickStartWorkout() {
    this.router.navigate(['/tabs/workout-management']);
  }

  navigateToExercises() {
    this.router.navigate(['/tabs/lista']);
  }

  navigateToProgress() {
    this.router.navigate(['/tabs/workout-progress']);
  }

  async navigateToNutrition() {
    const toast = await this.toastController.create({
      message: 'Funcionalidade de nutrição em desenvolvimento!',
      duration: 2000,
      position: 'bottom',
      color: 'primary'
    });
    await toast.present();
  }

  navigateToHistory() {
    this.router.navigate(['/tabs/workout-progress']);
  }

  startFirstWorkout() {
    this.router.navigate(['/tabs/home']);
  }

  // Métodos para as preferências
  async toggleNotifications() {
    this.preferences.notifications = !this.preferences.notifications;
    await this.savePreferences();
  }

  async onNotificationsChange(event: any) {
    this.preferences.notifications = event.detail.checked;
    await this.savePreferences();
  }

  async toggleDarkMode() {
    this.preferences.darkMode = !this.preferences.darkMode;
    await this.savePreferences();
    // Aplicar modo escuro
    document.body.classList.toggle('dark', this.preferences.darkMode);
  }

  async onDarkModeChange(event: any) {
    this.preferences.darkMode = event.detail.checked;
    await this.savePreferences();
    document.body.classList.toggle('dark', this.preferences.darkMode);
  }

  async setWorkoutReminder() {
    const alert = await this.alertController.create({
      header: 'Lembrete de Treino',
      message: 'Defina o horário para o lembrete diário:',
      inputs: [
        {
          name: 'time',
          type: 'time',
          value: this.preferences.reminderTime || '18:00'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Salvar',
          handler: async (data) => {
            this.preferences.reminderTime = data.time;
            await this.savePreferences();
            const toast = await this.toastController.create({
              message: 'Lembrete configurado com sucesso!',
              duration: 2000,
              position: 'bottom',
              color: 'success'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }

  async savePreferences() {
    try {
      await this.storageService.set('userPreferences', this.preferences);
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
    }
  }

  async openSettings() {
    // Navegar para uma página de configurações ou mostrar modal
    const toast = await this.toastController.create({
      message: 'Configurações em desenvolvimento',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async exportData() {
    try {
      const allData = {
        userProfile: await this.storageService.get('userProfile'),
        workoutSessions: await this.storageService.get('workoutSessions'),
        achievements: await this.storageService.get('achievements'),
        preferences: await this.storageService.get('userPreferences')
      };

      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Criar link para download
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fitsync-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);

      const toast = await this.toastController.create({
        message: 'Dados exportados com sucesso!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      const toast = await this.toastController.create({
        message: 'Erro ao exportar dados',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }
}
