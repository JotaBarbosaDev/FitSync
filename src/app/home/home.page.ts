import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastController } from '@ionic/angular';
import { CustomWorkout, WorkoutExercise, WorkoutSession, ExerciseSet } from '../models/workout-system.model';
import { WorkoutManagementService } from '../services/workout-management.service';
import { Storage } from '@ionic/storage-angular';
import { Subscription } from 'rxjs';
import { JsonDataService } from '../services/json-data.service';
import { ExerciseService } from '../services/exercise.service';

interface TodayWorkout {
  workout: CustomWorkout | null;
  isRestDay: boolean;
}

interface CompletedWorkoutToday {
  session: WorkoutSession;
  exercises: WorkoutExercise[];
  canRepeat: boolean;
}

interface QuickStats {
  weeklyWorkouts: number;
  weeklyMinutes: number;
  weeklyCalories: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  userProfile = {
    name: 'João'
  };

  todayWorkout: TodayWorkout | null = null;
  completedWorkoutToday: CompletedWorkoutToday | null = null;
  isLoading = true;
  quickStats: QuickStats = { weeklyWorkouts: 0, weeklyMinutes: 0, weeklyCalories: 0 };
  recentAchievements: Achievement[] = [];
  dailyTip = '';
  weeklyProgress = 0; // Porcentagem de 0 a 100
  currentStreak = 0;

  // Stats properties (getters will be used instead)
  weeklyWorkouts = 0;
  totalMinutes = 0;
  weeklyCalories = 0;

  // Subscription management
  private subscriptions: Subscription[] = [];
  private isInitialized = false;
  
  // Estado interno para controle de inicialização
  private _isInitializing = false;
  private _destroyed = false;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private toastController: ToastController,
    private workoutManagementService: WorkoutManagementService,
    private storage: Storage,
    private jsonDataService: JsonDataService,
    private exerciseService: ExerciseService,
    private route: ActivatedRoute
  ) { }

  async ngOnInit() {
    // Receber parâmetros da URL (requisito 5)
    this.route.queryParams.subscribe(params => {
      if (params['workoutCompleted']) {
        console.log('Treino completado recebido:', params['workoutCompleted']);
        this.showWorkoutCompletedMessage();
      }
      if (params['fromProfile']) {
        console.log('Navegação vinda do perfil:', params['fromProfile']);
      }
    });

    // Prevenir múltiplas inicializações
    if (this.isInitialized) {
      console.log('HomePage já foi inicializada, pulando...');
      return;
    }

    // Verificar se já está em processo de inicialização
    if (this._isInitializing) {
      console.log('HomePage já está sendo inicializada, aguardando...');
      return;
    }

    try {
      this._isInitializing = true;
      this.isInitialized = true;
      console.log('Iniciando HomePage...');

      // Criar storage de forma segura
      await this.safeStorageCreate();
      
      // Executar inicializações críticas
      await this.safeInitializeDefaults();
      await this.safeLoadUserProfile();

      // Verificar se o componente ainda está ativo antes de continuar
      if (!this.isComponentActive()) {
        console.log('Componente não está mais ativo, interrompendo inicialização');
        return;
      }

      // Executar carregamentos não-críticos
      await this.loadNonCriticalData();

      console.log('HomePage inicializada com sucesso');
      
    } catch (error) {
      console.error('Erro durante inicialização da HomePage:', error);
      this.setDefaultValues();
    } finally {
      this.isLoading = false;
      this._isInitializing = false;
    }
  }

  async ionViewWillEnter() {
    // Recarregar dados quando o usuário retornar à página
    console.log('🔄 ionViewWillEnter - Recarregando dados da home...');
    
    try {
      // IMPORTANTE: Força atualização completa do cache do storage
      await this.storage.create();
      
      // Força recarregamento do treino de hoje com dados frescos
      await this.safeLoadTodayWorkout();
      
      // Força recarregamento das estatísticas
      await this.safeLoadQuickStats();
      
      console.log('✅ Dados da home atualizados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar dados da home:', error);
    }
  }

  /**
   * Força atualização de todos os dados da página home
   * Útil quando há mudanças no workout-management
   */
  public async forceRefreshData(): Promise<void> {
    console.log('🔄 Forçando atualização completa dos dados da home...');
    
    try {
      // Recarregar treino de hoje
      await this.safeLoadTodayWorkout();
      
      // Recarregar estatísticas
      await this.safeLoadQuickStats();
      
      // Verificar treino completado hoje
      await this.safeCheckCompletedWorkout();
      
      // Recarregar conquistas recentes
      await this.safeLoadRecentAchievements();
      
      console.log('✅ Atualização completa finalizada com sucesso');
    } catch (error) {
      console.error('❌ Erro durante atualização completa:', error);
    }
  }



  private async safeStorageCreate() {
    try {
      await Promise.race([
        this.storage.create(),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn('Timeout na criação do storage');
            resolve();
          }, 1000);
        })
      ]);
    } catch (error) {
      console.error('Erro ao criar storage:', error);
    }
  }

  private async safeInitializeDefaults() {
    try {
      // Apenas inicializar workouts se absolutamente necessário
      const existingWorkouts = await this.storageService.get('workouts').catch(() => null);
      if (!existingWorkouts || !Array.isArray(existingWorkouts) || existingWorkouts.length === 0) {
        const defaultWorkouts = this.createMinimalDefaultWorkouts();
        await this.storageService.set('workouts', defaultWorkouts).catch(() => {});
      }

      // Inicializar sessões de exemplo para demonstração das estatísticas
      await this.initializeExampleWorkoutSessions();
    } catch (error) {
      console.error('Erro ao inicializar defaults:', error);
    }
  }

  private async safeLoadUserProfile() {
    try {
      const profile = await this.storageService.get('userProfile').catch(() => null);
      if (profile && typeof profile === 'object' && 'name' in profile) {
        this.userProfile.name = (profile as { name: string }).name;
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  }

  private async loadNonCriticalData() {
    if (!this.isComponentActive()) return;

    console.log('🔄 Carregando dados não-críticos...');

    try {
      // Carregar dados de forma sequencial para evitar conflitos
      await this.safeLoadTodayWorkout();
      
      if (!this.isComponentActive()) return;
      
      await this.safeLoadQuickStats();
      
      if (!this.isComponentActive()) return;
      
      await this.safeCheckCompletedWorkout();
      
      if (!this.isComponentActive()) return;
      
      await this.safeLoadRecentAchievements();

      // Carregar dica do dia (síncrono)
      this.loadDailyTip();

      console.log('✅ Dados não-críticos carregados com sucesso');
      
    } catch (error) {
      console.error('❌ Erro no carregamento não-crítico:', error);
    }
  }

  private async safeLoadQuickStats() {
    try {
      await this.loadQuickStats();
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      this.setDefaultQuickStats();
    }
  }


  private async safeLoadTodayWorkout() {
    try {
      await this.loadTodayWorkout(); // Usar o método corrigido
    } catch (error) {
      console.error('Erro ao carregar treino do dia:', error);
      this.setDefaultTodayWorkout();
    }
  }

  private async safeCheckCompletedWorkout() {
    try {
      await this.checkCompletedWorkoutToday();
    } catch (error) {
      console.error('Erro ao verificar treino completado:', error);
    }
  }

  private async safeLoadRecentAchievements() {
    try {
      const achievements = await this.storageService.get('achievements').catch(() => []);
      this.recentAchievements = Array.isArray(achievements) ? achievements.slice(0, 3) : [];
    } catch (error) {
      console.error('Erro ao carregar conquistas:', error);
      this.recentAchievements = [];
    }
  }

  private isComponentActive(): boolean {
    return this.isInitialized && !this._destroyed;
  }

  private setDefaultValues() {
    this.setDefaultQuickStats();
    this.setDefaultTodayWorkout();
    this.recentAchievements = [];
    this.dailyTip = 'Mantenha-se focado nos seus objetivos fitness!';
    this.completedWorkoutToday = null;
  }

  private setDefaultTodayWorkout() {
    const today = new Date().getDay();
    const todayName = this.translateDayName(today);
    console.log(`🔧 Definindo treino padrão para o dia ${today} (${todayName})`);
    
    // CORREÇÃO: Por padrão, se não há plano semanal configurado, considerar como dia de descanso
    // Isso força o usuário a configurar seu plano semanal na página workout-management
    this.todayWorkout = { 
      workout: null, 
      isRestDay: true 
    };
    console.log(`🛌 ${todayName} definido como dia de descanso (sem plano semanal configurado)`);
  }

  private createMinimalDefaultWorkouts(): CustomWorkout[] {
    // Criar apenas 3 workouts básicos em vez de 5
    return [1, 2, 3].map(day => this.createBasicWorkout(day));
  }

  ngOnDestroy() {
    // Marcar componente como destruído
    this._destroyed = true;
    
    // Limpar todas as subscriptions para prevenir memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.isInitialized = false;
    
    console.log('HomePage destruída e subscriptions limpas');
  }

  async initializeDefaultWorkouts() {
    try {
      const existingWorkouts = await this.storageService.get('workouts');
      if (!existingWorkouts || !Array.isArray(existingWorkouts) || existingWorkouts.length === 0) {
        console.log('Criando treinos padrão...');
        const defaultWorkouts = this.createDefaultWorkouts();
        await this.storageService.set('workouts', defaultWorkouts);
        console.log('Treinos padrão criados:', defaultWorkouts);
      }
    } catch (error) {
      console.error('Erro ao inicializar treinos padrão:', error);
    }
  }

  async initializeExampleWorkoutSessions() {
    try {
      // Sempre verificar e recriar sessões de exemplo para a semana atual
      const existingSessions = await this.storageService.get('workoutSessions') || [];
      
      // Verificar se há sessões desta semana
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const thisWeekSessions = Array.isArray(existingSessions) ? existingSessions.filter((session: unknown) => {
        try {
          const sessionObj = session as Record<string, unknown>;
          const sessionDate = new Date(sessionObj['startTime'] as string || sessionObj['date'] as string);
          return !isNaN(sessionDate.getTime()) && sessionDate >= startOfWeek;
        } catch {
          return false;
        }
      }) : [];
      
      console.log(`Sessões encontradas desta semana: ${thisWeekSessions.length}`);
      
      // Se há menos de 2 sessões desta semana, criar dados de exemplo atuais
      if (thisWeekSessions.length < 2) {
        console.log('Criando sessões de exemplo para demonstrar as estatísticas...');
        const exampleSessions = this.createExampleWorkoutSessions();
        
        // Remover sessões antigas desta semana para evitar duplicatas
        const otherSessions = Array.isArray(existingSessions) ? existingSessions.filter((session: unknown) => {
          try {
            const sessionObj = session as Record<string, unknown>;
            const sessionDate = new Date(sessionObj['startTime'] as string || sessionObj['date'] as string);
            return isNaN(sessionDate.getTime()) || sessionDate < startOfWeek;
          } catch {
            return true;
          }
        }) : [];
        
        const allSessions = [...otherSessions, ...exampleSessions];
        await this.storageService.set('workoutSessions', allSessions);
        console.log('Sessões de treino de exemplo criadas para a semana atual:', exampleSessions.length);
      }
    } catch (error) {
      console.error('Erro ao inicializar sessões de exemplo:', error);
    }
  }

  createExampleWorkoutSessions() {
    const now = new Date();
    const sessions = [];

    // Criar 4 sessões desta semana com dados mais realistas
    const workoutTypes = [
      { id: 'chest-workout-current', name: 'Treino de Peito', calories: 280 },
      { id: 'back-workout-current', name: 'Treino de Costas', calories: 320 },
      { id: 'legs-workout-current', name: 'Treino de Pernas', calories: 380 },
      { id: 'arms-workout-current', name: 'Treino de Braços', calories: 250 }
    ];

    for (let i = 0; i < 4; i++) {
      const sessionDate = new Date(now);
      // Distribuir ao longo da semana: hoje-1h, ontem, anteontem, 3 dias atrás
      if (i === 0) {
        // Sessão de hoje, uma hora atrás
        sessionDate.setHours(now.getHours() - 1, 30, 0, 0);
      } else {
        // Sessões dos dias anteriores
        sessionDate.setDate(now.getDate() - i);
        sessionDate.setHours(19 - i, 30, 0, 0);
      }

      const workoutType = workoutTypes[i];
      const session = {
        id: `session_current_${Date.now()}_${i}`,
        workoutId: workoutType.id,
        workoutName: workoutType.name,
        startTime: sessionDate.toISOString(),
        endTime: new Date(sessionDate.getTime() + (45 * 60 * 1000)).toISOString(),
        duration: 45 + (i * 5), // 45-60 minutos
        caloriesBurned: workoutType.calories,
        completedExercises: [
          { id: `ex_${i}_1`, name: `Exercício ${i + 1}.1`, calories: Math.floor(workoutType.calories * 0.3) },
          { id: `ex_${i}_2`, name: `Exercício ${i + 1}.2`, calories: Math.floor(workoutType.calories * 0.4) },
          { id: `ex_${i}_3`, name: `Exercício ${i + 1}.3`, calories: Math.floor(workoutType.calories * 0.3) }
        ],
        exercises: [
          { id: `ex_${i}_1`, name: `Exercício ${i + 1}.1`, calories: Math.floor(workoutType.calories * 0.3) },
          { id: `ex_${i}_2`, name: `Exercício ${i + 1}.2`, calories: Math.floor(workoutType.calories * 0.4) },
          { id: `ex_${i}_3`, name: `Exercício ${i + 1}.3`, calories: Math.floor(workoutType.calories * 0.3) }
        ],
        rating: 4 + (i % 2),
        status: 'completed',
        dayOfWeek: sessionDate.toLocaleDateString('pt-BR', { weekday: 'long' }),
        notes: `${workoutType.name} - Sessão excelente!`
      };

      sessions.push(session);
    }

    console.log('Sessões de exemplo criadas:', sessions.map(s => ({ 
      name: s.workoutName, 
      date: new Date(s.startTime).toLocaleDateString('pt-BR'),
      duration: s.duration,
      calories: s.caloriesBurned
    })));

    return sessions;
  }

  createDefaultWorkouts(): CustomWorkout[] {
    const days = [
      { index: 1, name: 'Segunda-feira' },
      { index: 2, name: 'Terça-feira' },
      { index: 3, name: 'Quarta-feira' },
      { index: 4, name: 'Quinta-feira' },
      { index: 5, name: 'Sexta-feira' }
    ];

    return days.map(day => this.createBasicWorkout(day.index));
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  getTodayDayName(): string {
    const today = new Date();
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return dayNames[today.getDay()];
  }

  getCurrentDate(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return today.toLocaleDateString('pt-BR', options);
  }

  get currentWorkout(): CustomWorkout | null {
    return this.todayWorkout?.workout || null;
  }

  get workoutDurationDisplay(): string {
    const workout = this.currentWorkout;
    if (!workout) return '0';
    return workout.estimatedDuration?.toString() || '30';
  }

  get workoutExercisesCount(): number {
    const workout = this.currentWorkout;
    return workout?.exercises?.length || 0;
  }

  navigateToWorkoutManagement() {
    this.router.navigate(['/tabs/workout-management']);
  }

  async startTodayWorkout() {
    console.log('🚀 Iniciando treino do dia...');
    console.log('Estado atual:', {
      todayWorkout: this.todayWorkout,
      currentWorkout: this.currentWorkout,
      isRestDay: this.todayWorkout?.isRestDay
    });

    // Verificar se é dia de descanso
    if (this.todayWorkout?.isRestDay) {
      const toast = await this.toastController.create({
        message: '🛌 Hoje é dia de descanso! Aproveite para relaxar.',
        duration: 3000,
        position: 'bottom',
        color: 'secondary'
      });
      await toast.present();
      return;
    }

    // CORREÇÃO: Sempre buscar os exercícios mais recentes diretamente do storage
    try {
      const todayExercises = await this.getTodayExercisesFromWeeklyPlan();

      if (todayExercises && todayExercises.length > 0) {
        console.log('💪 Iniciando treino com exercícios atualizados:', todayExercises.length, 'exercícios');
        
        // Navegar para execução com exercícios atualizados do plano semanal
        this.router.navigate(['/tabs/workout-execution'], {
          queryParams: {
            exercises: JSON.stringify(todayExercises),
            dayName: this.getTodayDayName(),
            source: 'weekly-plan'
          }
        });
        return;
      }
    } catch (error) {
      console.warn('Erro ao carregar exercícios do plano semanal:', error);
    }

    // Se não há exercícios no plano semanal, verificar se há treino configurado
    if (!this.currentWorkout) {
      const toast = await this.toastController.create({
        message: 'Nenhum treino disponível para hoje. Configure seu plano semanal!',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();

      // Navegar para configuração do plano semanal
      this.router.navigate(['/tabs/workout-management']);
      return;
    }

    // Fallback: se chegou até aqui é porque não há exercícios atualizados
    // Forçar atualização do treino antes de iniciar
    console.log('⚠️ Forçando atualização do treino antes de iniciar...');
    await this.safeLoadTodayWorkout();
    
    // Tentar novamente com dados atualizados
    const refreshedExercises = await this.getTodayExercisesFromWeeklyPlan();
    if (refreshedExercises && refreshedExercises.length > 0) {
      console.log('✅ Treino atualizado com sucesso, iniciando...');
      this.router.navigate(['/tabs/workout-execution'], {
        queryParams: {
          exercises: JSON.stringify(refreshedExercises),
          dayName: this.getTodayDayName(),
          source: 'weekly-plan-refreshed'
        }
      });
    } else {
      // Último recurso: usar o treino atual mas avisa o usuário
      const toast = await this.toastController.create({
        message: '⚠️ Usando versão anterior do treino. Atualize o plano se necessário.',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();

      if (this.currentWorkout && this.currentWorkout.exercises && this.currentWorkout.exercises.length > 0) {
        this.router.navigate(['/tabs/workout-execution'], {
          queryParams: {
            exercises: JSON.stringify(this.currentWorkout.exercises),
            workoutId: this.currentWorkout.id,
            workoutName: this.currentWorkout.name,
            source: 'fallback'
          }
        });
      }
    }
  }

  async loadTodayWorkout() {
    try {
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const todayName = this.translateDayName(today);
      console.log(`🔍 Carregando treino para hoje (${today} = ${todayName})`);

      // FLUXO CORRIGIDO: Verificar diretamente o plano semanal do workout-management
      await this.storage.create();
      const dayKey = `weekly_exercises_day_${today}`;
      const todayExercises = await this.storage.get(dayKey) || [];

      console.log(`📅 Exercícios encontrados para hoje (${todayName}):`, todayExercises);

      // Se não há exercícios para hoje, é dia de descanso
      if (!todayExercises || !Array.isArray(todayExercises) || todayExercises.length === 0) {
        console.log(`🛌 Hoje (${todayName}) é dia de descanso - nenhum exercício planejado`);
        this.todayWorkout = {
          workout: null,
          isRestDay: true
        };
        return;
      }

      // Se há exercícios planejados, criar treino do dia
      console.log(`💪 ${todayExercises.length} exercícios encontrados para hoje (${todayName})`);
      
      const todayWorkout: CustomWorkout = {
        id: `today-workout-${today}-${Date.now()}`,
        name: `Treino de ${todayName}`,
        description: `Treino planejado para ${todayName}`,
        difficulty: 'medium' as 'easy' | 'medium' | 'hard',
        muscleGroups: this.extractMuscleGroupsFromExercises(todayExercises),
        equipment: ['bodyweight'],
        isTemplate: false,
        category: 'strength',
        estimatedDuration: Math.min(todayExercises.length * 3, 60), // 3 minutos por exercício, max 60min
        exercises: todayExercises.map((exercise: Record<string, unknown>, index: number) => ({
          id: `exercise-${today}-${index}`,
          exerciseId: exercise['id'] as string,
          order: index + 1,
          sets: exercise['sets'] as ExerciseSet[] || [
            { id: `set-${index}-1`, reps: exercise['reps'] as number || 12, weight: exercise['weight'] as number || 0, completed: false },
            { id: `set-${index}-2`, reps: exercise['reps'] as number || 12, weight: exercise['weight'] as number || 0, completed: false },
            { id: `set-${index}-3`, reps: exercise['reps'] as number || 12, weight: exercise['weight'] as number || 0, completed: false }
          ],
          restTime: exercise['restTime'] as number || 60,
          notes: exercise['notes'] as string || ''
        })),
        createdBy: 'weekly-plan',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.todayWorkout = {
        workout: todayWorkout,
        isRestDay: false
      };

      console.log('✅ Treino de hoje criado com sucesso:', todayWorkout.name);

    } catch (error) {
      console.error('❌ Erro ao carregar treino de hoje:', error);
      // Em caso de erro, definir como dia de descanso por segurança
      this.todayWorkout = {
        workout: null,
        isRestDay: true
      };
    }
  }

  private async loadTodayWorkoutFallback() {
    try {
      const today = new Date().getDay(); // 0 = domingo, 1 = segunda, etc.
      const todayFormatted = this.getTodayDateString();

      console.log('Carregando treino para hoje:', this.translateDayName(today), '-', todayFormatted);

      // Buscar todos os treinos do storage
      const workoutsData = await this.storageService.get('workouts');
      const allWorkouts: CustomWorkout[] = Array.isArray(workoutsData) ? workoutsData : [];

      console.log('Treinos encontrados no storage:', allWorkouts);

      // Verificar se é domingo (dia de descanso)
      if (today === 0) {
        this.todayWorkout = { workout: null, isRestDay: true };
        console.log('Hoje é domingo - dia de descanso');
        return;
      }

      // Procurar por um treino que contenha o nome do dia ou seja adequado para hoje
      const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const todayName = dayNames[today];

      let todayWorkout = allWorkouts.find((workout: CustomWorkout) =>
        workout.name?.toLowerCase().includes(todayName) ||
        workout.category === todayName ||
        workout.description?.toLowerCase().includes(todayName)
      );

      // Se não encontrar um treino específico, usar o primeiro treino disponível
      if (!todayWorkout && allWorkouts.length > 0) {
        todayWorkout = allWorkouts[0];
      }

      // Se ainda não há treino, criar um treino básico
      if (!todayWorkout) {
        todayWorkout = this.createBasicWorkout(today);
        console.log('Criando treino básico para hoje:', todayWorkout.name);
      }

      this.todayWorkout = { workout: todayWorkout, isRestDay: false };
      console.log('Treino do dia carregado:', todayWorkout.name);

    } catch (error) {
      console.error('Erro ao carregar treino do dia:', error);
      // Em caso de erro, criar um treino básico
      const today = new Date().getDay();
      if (today === 0) {
        this.todayWorkout = { workout: null, isRestDay: true };
      } else {
        const basicWorkout = this.createBasicWorkout(today);
        this.todayWorkout = { workout: basicWorkout, isRestDay: false };
      }
    }
  }

  private getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // formato YYYY-MM-DD
  }

  private translateDayName(dayIndex: number): string {
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return dayNames[dayIndex] || 'Dia';
  }

  private createBasicWorkout(dayIndex: number): CustomWorkout {
    const dayName = this.translateDayName(dayIndex);
    const basicExercises = this.getBasicExercisesForDay(dayIndex);

    return {
      id: `basic-workout-${dayIndex}`,
      name: `${dayName}`,
      description: `Treino básico para ${dayName}`,
      difficulty: 'medium' as 'easy' | 'medium' | 'hard',
      muscleGroups: ['arms', 'chest', 'legs'],
      equipment: ['bodyweight'],
      isTemplate: false,
      category: 'strength',
      estimatedDuration: 30,
      exercises: basicExercises.map((exercise, index) => ({
        id: `exercise-${index}`,
        exerciseId: exercise.id,
        order: index + 1,
        sets: [
          { id: `set-${index}-1`, reps: 12, weight: 0, completed: false },
          { id: `set-${index}-2`, reps: 12, weight: 0, completed: false },
          { id: `set-${index}-3`, reps: 12, weight: 0, completed: false }
        ],
        restTime: 60,
        notes: ''
      })),
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getBasicExercisesForDay(dayIndex: number): Array<{ id: string; name: string; muscleGroups: string[] }> {
    // Exercícios básicos por dia da semana
    const exercisesByDay = {
      0: [ // Domingo - Descanso ou cardio leve
        { id: 'ex-sunday-1', name: 'Caminhada', muscleGroups: ['cardio'] },
        { id: 'ex-sunday-2', name: 'Alongamento', muscleGroups: ['flexibility'] }
      ],
      1: [ // Segunda - Peito e Tríceps
        { id: 'ex-monday-1', name: 'Flexões', muscleGroups: ['chest'] },
        { id: 'ex-monday-2', name: 'Tríceps no banco', muscleGroups: ['arms'] },
        { id: 'ex-monday-3', name: 'Supino inclinado', muscleGroups: ['chest'] }
      ],
      2: [ // Terça - Costas e Bíceps
        { id: 'ex-tuesday-1', name: 'Pull-ups', muscleGroups: ['back'] },
        { id: 'ex-tuesday-2', name: 'Rosca direta', muscleGroups: ['arms'] },
        { id: 'ex-tuesday-3', name: 'Remada curvada', muscleGroups: ['back'] }
      ],
      3: [ // Quarta - Pernas
        { id: 'ex-wednesday-1', name: 'Agachamento', muscleGroups: ['legs'] },
        { id: 'ex-wednesday-2', name: 'Leg press', muscleGroups: ['legs'] },
        { id: 'ex-wednesday-3', name: 'Panturrilha', muscleGroups: ['legs'] }
      ],
      4: [ // Quinta - Ombros
        { id: 'ex-thursday-1', name: 'Desenvolvimento militar', muscleGroups: ['shoulders'] },
        { id: 'ex-thursday-2', name: 'Elevação lateral', muscleGroups: ['shoulders'] },
        { id: 'ex-thursday-3', name: 'Elevação frontal', muscleGroups: ['shoulders'] }
      ],
      5: [ // Sexta - Braços
        { id: 'ex-friday-1', name: 'Rosca bíceps', muscleGroups: ['arms'] },
        { id: 'ex-friday-2', name: 'Tríceps francês', muscleGroups: ['arms'] },
        { id: 'ex-friday-3', name: 'Martelo', muscleGroups: ['arms'] }
      ],
      6: [ // Sábado - Cardio
        { id: 'ex-saturday-1', name: 'Corrida', muscleGroups: ['cardio'] },
        { id: 'ex-saturday-2', name: 'Burpees', muscleGroups: ['cardio'] },
        { id: 'ex-saturday-3', name: 'Jump squat', muscleGroups: ['cardio'] }
      ]
    };

    return exercisesByDay[dayIndex as keyof typeof exercisesByDay] || exercisesByDay[1];
  }

  // Method to get today's exercises from weekly plan
  private async getTodayExercisesFromWeeklyPlan(): Promise<Record<string, unknown>[]> {
    try {
      await this.storage.create();
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const dayKey = `weekly_exercises_day_${today}`;
      const exercises = await this.storage.get(dayKey) || [];

      console.log(`🔍 Buscando exercícios para hoje (${today} - ${this.translateDayName(today)}):`);
      console.log(`📊 Storage key: ${dayKey}`);
      console.log(`📋 Exercícios encontrados:`, exercises);
      console.log(`🔢 Total de exercícios: ${Array.isArray(exercises) ? exercises.length : 0}`);

      return Array.isArray(exercises) ? exercises : [];
    } catch {
      console.error('❌ Erro ao carregar exercícios do plano semanal');
      return [];
    }
  }

  // Method to extract muscle groups from exercises
  private extractMuscleGroupsFromExercises(exercises: Record<string, unknown>[]): string[] {
    if (!exercises || !Array.isArray(exercises)) return [];

    const muscleGroups = new Set<string>();
    exercises.forEach(exercise => {
      const exerciseMuscleGroups = exercise['muscleGroups'] as string[];
      if (exerciseMuscleGroups && Array.isArray(exerciseMuscleGroups)) {
        exerciseMuscleGroups.forEach((group: string) => muscleGroups.add(group));
      }
    });

    return Array.from(muscleGroups);
  }

  async checkCompletedWorkoutToday() {
    try {
      console.log('Verificando treino completado hoje...');
      
      const today = new Date();
      const todayDateString = today.toDateString();

      // Timeout protection para operações de storage
      const checkWorkoutPromise = Promise.race([
        this.checkWorkoutInternal(todayDateString),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn('Timeout ao verificar treino completado hoje');
            resolve();
          }, 1500);
        })
      ]);

      await checkWorkoutPromise;
    } catch (error) {
      console.error('Erro ao verificar treino completado hoje:', error);
    }
  }

  private async checkWorkoutInternal(todayDateString: string) {
    // Check for completed workout sessions today com limitação de performance
    const sessionsPromises = [
      this.storageService.get('workoutSessions').catch(() => []),
      this.storageService.get('workoutSessions2').catch(() => [])
    ];

    const [sessions, sessions2] = await Promise.all(sessionsPromises);

    // Ensure both are arrays and limit size for performance
    const sessionsArray = Array.isArray(sessions) ? sessions.slice(0, 50) : [];
    const sessions2Array = Array.isArray(sessions2) ? sessions2.slice(0, 50) : [];

    // Combine both session stores for compatibility
    const allSessions = [...sessionsArray, ...sessions2Array];

    const todayCompletedSessions = allSessions.filter((session: Record<string, unknown>) => {
      try {
        if (!session?.['startTime'] || session['status'] !== 'completed') return false;

        const sessionDate = new Date(session['startTime'] as string);
        // Validar se a data é válida
        if (isNaN(sessionDate.getTime())) return false;
        
        return sessionDate.toDateString() === todayDateString;
      } catch {
        console.warn('Erro ao processar sessão:', session);
        return false;
      }
    });

    if (todayCompletedSessions.length > 0) {
      // Get the most recent completed session
      const latestSession = todayCompletedSessions.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        try {
          return new Date(b['startTime'] as string).getTime() - new Date(a['startTime'] as string).getTime();
        } catch {
          return 0;
        }
      })[0];

      // Extract exercises from the session for repeat functionality
      const exercises = this.extractExercisesFromSession(latestSession);

      this.completedWorkoutToday = {
        session: latestSession,
        exercises: exercises,
        canRepeat: exercises.length > 0 && exercises.length <= 20 // Limitar a 20 exercícios
      };

      console.log('Treino completado hoje encontrado:', this.completedWorkoutToday);
    }
  }

  private extractExercisesFromSession(session: Record<string, unknown>): WorkoutExercise[] {
    try {
      // Handle different session formats
      const exercises = session['exercises'] as Array<Record<string, unknown>>;
      if (exercises && Array.isArray(exercises)) {
        // Handle WorkoutManagementService format
        return exercises.map((exercise: Record<string, unknown>, index: number) => ({
          id: exercise['exerciseId'] as string || exercise['id'] as string || `exercise-${Date.now()}-${index}`,
          exerciseId: exercise['exerciseId'] as string || exercise['id'] as string || `exercise-${Date.now()}-${index}`,
          order: index + 1,
          sets: [
            { id: `set-${index}-1`, reps: 12, weight: 0, duration: 0, distance: 0, completed: false }
          ],
          restTime: 60,
          notes: exercise['notes'] as string || 'Repetir exercício do treino anterior'
        }));
      }

      return [];
    } catch {
      console.error('Erro ao extrair exercícios da sessão:', session);
      return [];
    }
  }

  async repeatTodayWorkout() {
    if (!this.completedWorkoutToday || !this.completedWorkoutToday.canRepeat) {
      const toast = await this.toastController.create({
        message: 'Nenhum treino disponível para repetir hoje',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    try {
      console.log('Repetindo treino de hoje com exercícios:', this.completedWorkoutToday.exercises);

      // Navigate to workout execution with today's completed exercises
      this.router.navigate(['/tabs/workout-execution'], {
        queryParams: {
          exercises: JSON.stringify(this.completedWorkoutToday.exercises),
          dayName: this.getTodayDayName(),
          source: 'repeat-today',
          originalSession: JSON.stringify({
            id: this.completedWorkoutToday.session.id,
            startTime: this.completedWorkoutToday.session.startTime
          })
        }
      });

      const toast = await this.toastController.create({
        message: '🔄 Repetindo treino de hoje!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      console.error('Erro ao repetir treino:', error);
      const toast = await this.toastController.create({
        message: 'Erro ao repetir treino. Tente novamente.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  get hasCompletedWorkoutToday(): boolean {
    return !!(this.completedWorkoutToday && this.completedWorkoutToday.canRepeat);
  }

  // Novos métodos para a página home melhorada

  async loadUserProfile() {
    try {
      const profile = await this.storageService.get('userProfile');
      if (profile && typeof profile === 'object' && 'name' in profile) {
        this.userProfile.name = (profile as { name: string }).name;
      }
    } catch {
      console.error('Erro ao carregar perfil do usuário');
    }
  }

  async loadQuickStats() {
    try {
      console.log('Carregando estatísticas rápidas...');
      const startTime = performance.now();
      
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Timeout protection - se demorar mais que 2 segundos, usar valores padrão
      const loadStatsWithTimeout = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('Timeout ao carregar estatísticas, usando valores padrão');
          this.setDefaultQuickStats();
          resolve();
        }, 2000);

        this.loadStatsInternal(startOfWeek).then(() => {
          clearTimeout(timeout);
          resolve();
        }).catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await loadStatsWithTimeout;
      
      const endTime = performance.now();
      console.log(`Estatísticas carregadas em ${endTime - startTime}ms`);
    } catch (error) {
      console.error('Erro ao carregar estatísticas rápidas:', error);
      this.setDefaultQuickStats();
    }
  }

  private async loadStatsInternal(startOfWeek: Date) {
    // CORREÇÃO: Unificar fonte de dados para estatísticas - usar apenas workoutSessions
    console.log('📊 Carregando estatísticas da semana atual...');
    
    try {
      // Carregar apenas a fonte principal de sessões de treino
      const workoutSessions = await this.storageService.get('workoutSessions') || [];
      
      // Garantir que é um array válido
      const validSessions = Array.isArray(workoutSessions) ? workoutSessions : [];
      
      console.log(`📈 Total de sessões encontradas: ${validSessions.length}`);

      // Filtrar sessões desta semana
      const thisWeekSessions = validSessions.filter((session: Record<string, unknown>) => {
        try {
          if (!session?.['startTime'] && !session?.['date']) return false;
          
          const sessionDate = new Date(session['startTime'] as string || session['date'] as string);
          if (isNaN(sessionDate.getTime())) return false;
          
          // Verificar se é desta semana e se é treino completado
          const isThisWeek = sessionDate >= startOfWeek;
          const isCompleted = session['status'] === 'completed' || session['completed'] === true;
          
          return isThisWeek && isCompleted;
        } catch {
          console.warn('Erro ao processar sessão:', session);
          return false;
        }
      });

      console.log(`✅ Sessões desta semana (completadas): ${thisWeekSessions.length}`);

      // Remover duplicatas se necessário
      const uniqueSessions = this.removeDuplicateSessions(thisWeekSessions);

      // Calcular estatísticas da semana atual
      this.quickStats.weeklyWorkouts = uniqueSessions.length;
      this.quickStats.weeklyMinutes = this.calculateTotalMinutes(uniqueSessions);
      this.quickStats.weeklyCalories = this.calculateTotalCalories(uniqueSessions);

      // Atualizar as propriedades do template
      this.weeklyWorkouts = this.quickStats.weeklyWorkouts;
      this.totalMinutes = this.quickStats.weeklyMinutes;
      this.weeklyCalories = this.quickStats.weeklyCalories;

      // Calcular progresso semanal (meta: 4 treinos por semana)
      this.weeklyProgress = Math.min((this.quickStats.weeklyWorkouts / 4) * 100, 100);

      console.log('📊 Estatísticas calculadas:', {
        weeklyWorkouts: this.weeklyWorkouts,
        totalMinutes: this.totalMinutes,
        weeklyCalories: this.weeklyCalories,
        weeklyProgress: this.weeklyProgress
      });

    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      this.setDefaultQuickStats();
    }
  }

  private removeDuplicateSessions(sessions: Record<string, unknown>[]): Record<string, unknown>[] {
    const seen = new Set<string>();
    return sessions.filter((session: Record<string, unknown>) => {
      try {
        const sessionTime = new Date(session['startTime'] as string || session['date'] as string).getTime();
        const roundedTime = Math.floor(sessionTime / (5 * 60 * 1000)) * (5 * 60 * 1000); // Arredondar para intervalos de 5 min
        const key = `${roundedTime}_${session['duration'] || 0}`;
        
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      } catch {
        return true; // Em caso de erro, manter a sessão
      }
    });
  }

  private calculateTotalMinutes(sessions: Record<string, unknown>[]): number {
    return sessions.reduce((total: number, session: Record<string, unknown>) => {
      const duration = session['duration'] as number || 0;
      return total + (typeof duration === 'number' ? Math.max(0, Math.min(duration, 300)) : 0); // Limitar a 300 min por sessão
    }, 0);
  }

  private calculateTotalCalories(sessions: Record<string, unknown>[]): number {
    return sessions.reduce((total: number, session: Record<string, unknown>) => {
      try {
        // Para o formato legado
        const caloriesBurned = session['caloriesBurned'] as number;
        if (caloriesBurned && typeof caloriesBurned === 'number') {
          return total + Math.max(0, Math.min(caloriesBurned, 2000)); // Limitar a 2000 cal por sessão
        }
        
        // Para o formato ProgressDataService - calcular dos exercícios
        const exercises = session['exercises'] as Array<Record<string, unknown>>;
        if (exercises && Array.isArray(exercises)) {
          const sessionCalories = exercises.slice(0, 20).reduce((exerciseTotal: number, exercise: Record<string, unknown>) => {
            const calories = exercise['calories'] as number || 50;
            return exerciseTotal + (typeof calories === 'number' ? Math.max(0, Math.min(calories, 500)) : 50);
          }, 0);
          return total + sessionCalories;
        }
        
        // Fallback
        return total + 150; // Valor padrão razoável
      } catch {
        return total + 150;
      }
    }, 0);
  }

  private setDefaultQuickStats() {
    this.quickStats = { weeklyWorkouts: 0, weeklyMinutes: 0, weeklyCalories: 0 };
    this.weeklyWorkouts = 0;
    this.totalMinutes = 0;
    this.weeklyCalories = 0;
    this.weeklyProgress = 0;
    console.log('Estatísticas padrão definidas');
  }

  async loadRecentAchievements() {
    try {
      const achievements = await this.storageService.get('achievements') || [];
      // Pegar as 3 conquistas mais recentes
      this.recentAchievements = Array.isArray(achievements) ? achievements
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => 
          new Date(b['earnedAt'] as string).getTime() - new Date(a['earnedAt'] as string).getTime())
        .slice(0, 3)
        .map((achievement: Record<string, unknown>) => ({
          id: achievement['id'] as string,
          title: achievement['title'] as string,
          description: achievement['description'] as string,
          icon: achievement['icon'] as string || '🏆',
          earnedAt: new Date(achievement['earnedAt'] as string)
        })) : [];
    } catch (error) {
      console.error('Erro ao carregar conquistas recentes:', error);
      this.recentAchievements = [];
    }
  }

  loadDailyTip() {
    const tips = [
      'Beba água antes, durante e após o treino para manter-se hidratado.',
      'Aqueça sempre antes de começar os exercícios principais.',
      'Foque na forma correta do movimento, não apenas no peso.',
      'Descanse adequadamente entre os treinos para recuperação muscular.',
      'Varie seus exercícios para trabalhar diferentes grupos musculares.',
      'Mantenha uma alimentação balanceada para potencializar seus resultados.',
      'Durma pelo menos 7-8 horas por noite para uma recuperação adequada.',
      'Seja consistente - a regularidade é mais importante que a intensidade.',
      'Escute seu corpo e descanse quando necessário.',
      'Celebre pequenas vitórias no seu progresso fitness.'
    ];
    
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    this.dailyTip = tips[dayOfYear % tips.length];
  }

  getDailyTip(): string {
    return this.dailyTip || 'Mantenha-se focado nos seus objetivos fitness!';
  }

  getExercisePreview(): string[] {
    const workout = this.currentWorkout;
    if (!workout || !workout.exercises) return [];
    
    return workout.exercises
      .slice(0, 3)
      .map((ex: WorkoutExercise) => {
        // Mapear IDs de exercícios para nomes
        const exerciseNames: { [key: string]: string } = {
          'pushup': 'Flexão',
          'squat': 'Agachamento',
          'plank': 'Prancha',
          'lunges': 'Afundo',
          'burpees': 'Burpee',
          'jumping-jacks': 'Polichinelo',
          'mountain-climbers': 'Escalada',
          'crunches': 'Abdominal'
        };
        return exerciseNames[ex.exerciseId] || ex.exerciseId;
      });
  }

  getMuscleGroups(): string[] {
    const workout = this.currentWorkout;
    if (!workout || !workout.muscleGroups) return [];
    
    const muscleGroupNames: { [key: string]: string } = {
      'chest': 'Peito',
      'legs': 'Pernas',
      'back': 'Costas',
      'shoulders': 'Ombros',
      'arms': 'Braços',
      'core': 'Core',
      'glutes': 'Glúteos'
    };
    
    return workout.muscleGroups.map((mg: string) => muscleGroupNames[mg] || mg);
  }

  /**
   * Navegar para página de progresso com parâmetros
   */
  navigateToProgress() {
    this.router.navigate(['/tabs/workout-progress'], { 
      queryParams: { 
        fromHome: 'true',
        date: new Date().toISOString(),
        workoutCount: this.weeklyWorkouts 
      } 
    });
  }

  /**
   * Navegar para detalhes do treino com parâmetros
   */
  navigateToWorkoutDetails(workout: CustomWorkout | null) {
    this.router.navigate(['/tabs/detalhe'], { 
      queryParams: { 
        workoutId: workout?.id || 'today-workout',
        workoutName: workout?.name || 'Treino do Dia',
        fromPage: 'home',
        muscleGroups: workout?.muscleGroups?.join(',') || ''
      } 
    });
  }

  /**
   * Navegar para criação de treino com parâmetros
   */
  navigateToWorkoutCreation() {
    this.router.navigate(['/workout-creation'], { 
      queryParams: { 
        source: 'home',
        suggestedType: 'full-body',
        returnUrl: '/tabs/home'
      } 
    });
  }

  /**
   * Mostrar mensagem de treino completado (quando vem de outras páginas)
   */
  private showWorkoutCompletedMessage() {
    // Implementação da mensagem de sucesso
    console.log('Treino completado! Parabéns!');
  }
}
