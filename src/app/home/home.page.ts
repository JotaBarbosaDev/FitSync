import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { ToastController } from '@ionic/angular';
import { CustomWorkout } from '../models';
import { WorkoutManagementService } from '../services/workout-management.service';
import { Storage } from '@ionic/storage-angular';
import { Subscription } from 'rxjs';

interface TodayWorkout {
  workout: CustomWorkout | null;
  isRestDay: boolean;
}

interface CompletedWorkoutToday {
  session: any;
  exercises: any[];
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
  private subscriptions: Subscription = new Subscription();
  private isInitialized = false;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private toastController: ToastController,
    private workoutManagementService: WorkoutManagementService,
    private storage: Storage
  ) { }

  async ngOnInit() {
    // Prevenir múltiplas inicializações de forma mais robusta
    if (this.isInitialized) {
      console.log('HomePage já foi inicializada, pulando...');
      return;
    }

    // Verificar se já está em processo de inicialização
    if ((this as any)._isInitializing) {
      console.log('HomePage já está sendo inicializada, aguardando...');
      return;
    }

    try {
      (this as any)._isInitializing = true;
      this.isInitialized = true;
      console.log('Iniciando HomePage...');

      // Usar um timeout geral para toda a inicialização
      const initPromise = this.performInitialization();
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('Timeout geral na inicialização da HomePage, continuando...');
          resolve();
        }, 5000); // 5 segundos de timeout total
      });

      await Promise.race([initPromise, timeoutPromise]);
      console.log('HomePage inicializada com sucesso');
    } catch (error) {
      console.error('Erro durante inicialização da HomePage:', error);
    } finally {
      this.isLoading = false;
      (this as any)._isInitializing = false;
    }
  }

  private async performInitialization() {
    await this.storage.create();
    
    // Executar inicializações em paralelo onde possível
    const initPromises = [
      this.initializeDefaultWorkouts().catch((e: any) => console.error('Erro ao inicializar treinos padrão:', e)),
      this.initializeExampleWorkoutSessions().catch((e: any) => console.error('Erro ao inicializar sessões exemplo:', e)),
      this.loadUserProfile().catch((e: any) => console.error('Erro ao carregar perfil:', e))
    ];

    await Promise.all(initPromises);

    // Executar carregamentos que dependem dos dados iniciais
    const loadPromises = [
      this.loadQuickStats().catch((e: any) => console.error('Erro ao carregar estatísticas:', e)),
      this.loadRecentAchievements().catch((e: any) => console.error('Erro ao carregar conquistas:', e)),
      this.loadTodayWorkout().catch((e: any) => console.error('Erro ao carregar treino do dia:', e)),
      this.checkCompletedWorkoutToday().catch((e: any) => console.error('Erro ao verificar treino completado:', e))
    ];

    // Executar métodos síncronos separadamente
    try {
      this.loadDailyTip();
    } catch (e) {
      console.error('Erro ao carregar dica:', e);
    }

    await Promise.all(loadPromises);
  }

  ngOnDestroy() {
    // Limpar todas as subscriptions para prevenir memory leaks
    this.subscriptions.unsubscribe();
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
      const existingSessions = await this.storageService.get('workoutSessions') || [];
      
      // Se não há sessões, criar dados de exemplo para a semana atual
      if (!Array.isArray(existingSessions) || existingSessions.length === 0) {
        const exampleSessions = this.createExampleWorkoutSessions();
        await this.storageService.set('workoutSessions', exampleSessions);
        console.log('Sessões de treino de exemplo criadas:', exampleSessions);
      }
    } catch (error) {
      console.error('Erro ao inicializar sessões de exemplo:', error);
    }
  }

  createExampleWorkoutSessions() {
    const now = new Date();
    const sessions = [];

    // Criar 3 sessões desta semana
    for (let i = 0; i < 3; i++) {
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() - (i * 2)); // Sessões em dias alternados
      sessionDate.setHours(19, 0, 0, 0); // 19:00

      const session = {
        id: `session_${Date.now()}_${i}`,
        workoutId: `workout_${i + 1}`,
        startTime: sessionDate.toISOString(),
        endTime: new Date(sessionDate.getTime() + (45 * 60 * 1000)).toISOString(), // 45 min depois
        duration: 45, // minutos
        caloriesBurned: 250 + (i * 50), // 250, 300, 350 calorias
        completedExercises: [`ex_${i}_1`, `ex_${i}_2`, `ex_${i}_3`],
        rating: 4 + (i % 2), // Rating entre 4 e 5
        notes: `Treino ${i + 1} - Excelente session!`
      };

      sessions.push(session);
    }

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
    // Try to get today's exercises from weekly plan first
    const todayExercises = await this.getTodayExercisesFromWeeklyPlan();

    if (todayExercises && todayExercises.length > 0) {
      console.log('Iniciando treino do plano semanal:', todayExercises);

      // Navigate to workout execution with today's exercises from weekly plan
      this.router.navigate(['/tabs/workout-execution'], {
        queryParams: {
          exercises: JSON.stringify(todayExercises),
          dayName: this.getTodayDayName(),
          source: 'weekly-plan'
        }
      });
    } else if (this.todayWorkout?.workout) {
      console.log('Iniciando treino padrão:', this.todayWorkout.workout.name);

      // Fallback to default workout system
      this.router.navigate(['/tabs/workout-execution'], {
        queryParams: {
          workoutId: this.todayWorkout.workout.id,
          workoutName: this.todayWorkout.workout.name,
          source: 'today'
        }
      });
    } else {
      const toast = await this.toastController.create({
        message: 'Nenhum treino disponível para hoje. Configure seu plano semanal!',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();

      // Navigate to workout management to configure weekly plan
      this.router.navigate(['/workout-management']);
    }
  }

  async loadTodayWorkout() {
    try {
      console.log('Carregando treino do dia...');

      // First, try to get today's exercises from weekly plan
      const todayExercises = await this.getTodayExercisesFromWeeklyPlan();

      if (todayExercises && todayExercises.length > 0) {
        console.log('Encontrou exercícios no plano semanal:', todayExercises);

        // Create a virtual workout from weekly plan exercises
        const virtualWorkout: CustomWorkout = {
          id: `weekly-plan-${new Date().toISOString().split('T')[0]}`,
          name: `Treino de ${this.getTodayDayName()}`,
          description: 'Treino do plano semanal',
          difficulty: 'medium',
          muscleGroups: this.extractMuscleGroupsFromExercises(todayExercises),
          equipment: [],
          isTemplate: false,
          category: 'strength',
          estimatedDuration: todayExercises.length * 5, // 5 min per exercise
          exercises: todayExercises.map((ex: any, index: number) => ({
            id: `exercise-${index}`,
            exerciseId: ex.id,
            order: index + 1,
            sets: [{ id: `set-${index}-1`, reps: 12, weight: 0, completed: false }],
            restTime: 60,
            notes: ''
          })),
          createdBy: 'weekly-plan',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.todayWorkout = { workout: virtualWorkout, isRestDay: false };
        console.log('Treino criado a partir do plano semanal:', virtualWorkout.name);
        return;
      }

      // Fallback to the existing workout management service
      console.log('Nenhum exercício no plano semanal, usando WorkoutManagementService...');

      const todayWorkoutSub = this.workoutManagementService.getTodayWorkout().subscribe({
        next: (todayWorkout) => {
          this.todayWorkout = todayWorkout;
          console.log('Treino do dia carregado:', todayWorkout);
        },
        error: (error) => {
          console.error('Erro ao carregar treino do dia:', error);
          // Fallback para o método anterior
          this.loadTodayWorkoutFallback();
        }
      });

      // Adicionar subscription ao gerenciador
      this.subscriptions.add(todayWorkoutSub);
    } catch (error) {
      console.error('Erro ao carregar treino do dia:', error);
      this.loadTodayWorkoutFallback();
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

  private createBasicWorkout(dayIndex: number, dayOfWeek?: string): CustomWorkout {
    const dayName = this.translateDayName(dayIndex);
    const basicExercises = this.getBasicExercisesForDay(dayIndex);

    return {
      id: `basic-workout-${dayIndex}`,
      name: `Treino de ${dayName}`,
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

  private getBasicExercisesForDay(dayIndex: number): any[] {
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
  private async getTodayExercisesFromWeeklyPlan(): Promise<any[]> {
    try {
      await this.storage.create();
      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayKey = `weekly_exercises_day_${today}`;
      const exercises = await this.storage.get(dayKey) || [];

      console.log(`Exercícios do plano semanal para hoje (${today}):`, exercises);
      return exercises;
    } catch (error) {
      console.error('Erro ao carregar exercícios do plano semanal:', error);
      return [];
    }
  }

  // Method to extract muscle groups from exercises
  private extractMuscleGroupsFromExercises(exercises: any[]): string[] {
    if (!exercises || !Array.isArray(exercises)) return [];

    const muscleGroups = new Set<string>();
    exercises.forEach(exercise => {
      if (exercise.muscleGroups && Array.isArray(exercise.muscleGroups)) {
        exercise.muscleGroups.forEach((group: string) => muscleGroups.add(group));
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

    const todayCompletedSessions = allSessions.filter((session: any) => {
      try {
        if (!session?.startTime || session.status !== 'completed') return false;

        const sessionDate = new Date(session.startTime);
        // Validar se a data é válida
        if (isNaN(sessionDate.getTime())) return false;
        
        return sessionDate.toDateString() === todayDateString;
      } catch (error) {
        console.warn('Erro ao processar sessão:', error);
        return false;
      }
    });

    if (todayCompletedSessions.length > 0) {
      // Get the most recent completed session
      const latestSession = todayCompletedSessions.sort((a: any, b: any) => {
        try {
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        } catch (error) {
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

  private extractExercisesFromSession(session: any): any[] {
    try {
      // Handle different session formats
      if (session.exercises && Array.isArray(session.exercises)) {
        // Handle WorkoutManagementService format
        return session.exercises.map((exercise: any) => ({
          id: exercise.exerciseId || exercise.id || `exercise-${Date.now()}`,
          name: exercise.exerciseName || exercise.name || 'Exercício',
          category: exercise.category || 'strength',
          muscleGroups: exercise.muscleGroup ? [exercise.muscleGroup] : ['general'],
          equipment: ['bodyweight'],
          instructions: exercise.instructions || 'Execute conforme orientação anterior',
          difficulty: exercise.difficulty || 'medium',
          duration: 5,
          calories: 50,
          emoji: '💪',
          description: exercise.notes || 'Repetir exercício do treino anterior'
        }));
      }

      return [];
    } catch (error) {
      console.error('Erro ao extrair exercícios da sessão:', error);
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
      const profile: any = await this.storageService.get('userProfile');
      if (profile?.name) {
        this.userProfile.name = profile.name;
      }
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
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
    // Ler de ambos os locais para compatibilidade com limitação de performance
    const sessions1Promise = this.storageService.get('workoutSessions');
    const sessions2Promise = this.storage.get('workout_sessions');

    const [sessions1, sessions2] = await Promise.all([
      sessions1Promise.catch(() => []),
      sessions2Promise.catch(() => [])
    ]);

    // Garantir que ambos são arrays e limitar quantidade para performance
    const validSessions1 = Array.isArray(sessions1) ? sessions1.slice(0, 100) : [];
    const validSessions2 = Array.isArray(sessions2) ? sessions2.slice(0, 100) : [];

    // Combinar as sessões de ambos os formatos
    const allSessions = [...validSessions1, ...validSessions2];

    // Filtrar sessões desta semana com otimização
    const thisWeekSessions = allSessions.filter((session: any) => {
      try {
        let sessionDate;
        
        // Verificar diferentes formatos de data com validação
        if (session?.startTime) {
          sessionDate = new Date(session.startTime);
        } else if (session?.date) {
          sessionDate = new Date(session.date);
        } else {
          return false;
        }
        
        // Verificar se a data é válida
        if (isNaN(sessionDate.getTime())) {
          return false;
        }
        
        // Filtrar apenas sessões desta semana e que são treinos completos
        return sessionDate >= startOfWeek && 
               (session.status === 'completed' || session.duration > 0);
      } catch (error) {
        console.warn('Erro ao processar sessão:', error);
        return false;
      }
    });

    // Limitar processamento para performance
    const limitedSessions = thisWeekSessions.slice(0, 50);

    // Remover duplicatas com algoritmo otimizado
    const uniqueSessions = this.removeDuplicateSessions(limitedSessions);

    // Calcular estatísticas
    this.quickStats.weeklyWorkouts = uniqueSessions.length;
    this.quickStats.weeklyMinutes = this.calculateTotalMinutes(uniqueSessions);
    this.quickStats.weeklyCalories = this.calculateTotalCalories(uniqueSessions);

    // Atualizar as propriedades usadas no template
    this.weeklyWorkouts = this.quickStats.weeklyWorkouts;
    this.totalMinutes = this.quickStats.weeklyMinutes;
    this.weeklyCalories = this.quickStats.weeklyCalories;

    // Calcular progresso semanal (assumindo meta de 4 treinos por semana)
    this.weeklyProgress = Math.min((this.quickStats.weeklyWorkouts / 4) * 100, 100);

    console.log('Estatísticas calculadas:', {
      totalSessions: allSessions.length,
      thisWeekSessions: thisWeekSessions.length,
      uniqueSessions: uniqueSessions.length,
      weeklyWorkouts: this.weeklyWorkouts,
      totalMinutes: this.totalMinutes,
      weeklyCalories: this.weeklyCalories
    });
  }

  private removeDuplicateSessions(sessions: any[]): any[] {
    const seen = new Set<string>();
    return sessions.filter((session: any) => {
      try {
        const sessionTime = new Date(session.startTime || session.date).getTime();
        const roundedTime = Math.floor(sessionTime / (5 * 60 * 1000)) * (5 * 60 * 1000); // Arredondar para intervalos de 5 min
        const key = `${roundedTime}_${session.duration || 0}`;
        
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      } catch (error) {
        return true; // Em caso de erro, manter a sessão
      }
    });
  }

  private calculateTotalMinutes(sessions: any[]): number {
    return sessions.reduce((total: number, session: any) => {
      const duration = session.duration || 0;
      return total + (typeof duration === 'number' ? Math.max(0, Math.min(duration, 300)) : 0); // Limitar a 300 min por sessão
    }, 0);
  }

  private calculateTotalCalories(sessions: any[]): number {
    return sessions.reduce((total: number, session: any) => {
      try {
        // Para o formato legado
        if (session.caloriesBurned && typeof session.caloriesBurned === 'number') {
          return total + Math.max(0, Math.min(session.caloriesBurned, 2000)); // Limitar a 2000 cal por sessão
        }
        
        // Para o formato ProgressDataService - calcular dos exercícios
        if (session.exercises && Array.isArray(session.exercises)) {
          const sessionCalories = session.exercises.slice(0, 20).reduce((exerciseTotal: number, exercise: any) => {
            const calories = exercise.calories || 50;
            return exerciseTotal + (typeof calories === 'number' ? Math.max(0, Math.min(calories, 500)) : 50);
          }, 0);
          return total + sessionCalories;
        }
        
        // Fallback
        return total + 150; // Valor padrão razoável
      } catch (error) {
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
        .sort((a: any, b: any) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
        .slice(0, 3)
        .map((achievement: any) => ({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon || '🏆',
          earnedAt: new Date(achievement.earnedAt)
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
      .map((ex: any) => {
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
    
    return workout.muscleGroups.map((mg: any) => muscleGroupNames[mg] || mg);
  }

  navigateToWorkoutCreation() {
    this.router.navigate(['/workout-management/create']);
  }

  navigateToProgress() {
    this.router.navigate(['/tabs/workout-progress']);
  }

  navigateToWorkoutList() {
    this.router.navigate(['/tabs/lista']);
  }

  // Additional methods for the enhanced home page
  getMotivationalMessage(): string {
    const messages = [
      'Pronto para conquistar o dia?',
      'Vamos treinar e evoluir juntos!',
      'Cada treino é um passo em direção ao seu objetivo!',
      'Sua força está crescendo a cada dia!',
      'Hoje é um ótimo dia para se superar!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  getTodayProgress(): number {
    // Return a simple progress calculation based on current workout completion
    if (this.todayWorkout?.isRestDay) return 100;
    if (this.completedWorkoutToday) return 100;
    return this.currentWorkout ? 25 : 0;
  }

  getWorkoutMuscleGroups(): string {
    const muscleGroups = this.getMuscleGroups();
    return muscleGroups.slice(0, 2).join(', ');
  }

  getPreviewExercises(): any[] {
    const workout = this.currentWorkout || this.todayWorkout?.workout;
    if (!workout || !workout.exercises) return [];
    
    return workout.exercises.slice(0, 3).map((exercise: any) => ({
      name: exercise.name,
      sets: exercise.sets?.length || 3,
      reps: exercise.sets?.[0]?.reps || 12,
      category: exercise.category,
      muscleGroup: exercise.muscleGroups?.[0] || exercise.muscleGroup,
      difficulty: exercise.difficulty
    }));
  }

  getExerciseIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'arms': 'barbell-outline',
      'chest': 'fitness-outline', 
      'legs': 'walk-outline',
      'back': 'body-outline',
      'shoulders': 'triangle-outline',
      'cardio': 'heart-outline',
      'core': 'radio-button-on-outline',
      'fitness': 'fitness-outline'
    };
    return iconMap[category?.toLowerCase()] || 'fitness-outline';
  }

  getDefaultExerciseName(index: number): string {
    const defaultNames = [
      'Flexões de Braço',
      'Agachamentos',
      'Prancha Abdominal'
    ];
    return defaultNames[index] || 'Exercício';
  }

  getDefaultMuscleGroup(index: number): string {
    const defaultMuscles = [
      'Peito, Tríceps',
      'Pernas, Glúteos', 
      'Core, Abdômen'
    ];
    return defaultMuscles[index] || 'Múltiplos grupos';
  }

  getDifficultyLabel(difficulty: string): string {
    const difficultyMap: { [key: string]: string } = {
      'beginner': 'Iniciante',
      'intermediate': 'Intermediário', 
      'advanced': 'Avançado',
      'iniciante': 'Iniciante',
      'intermediário': 'Intermediário',
      'avançado': 'Avançado'
    };
    return difficultyMap[difficulty?.toLowerCase()] || 'Intermediário';
  }
}
