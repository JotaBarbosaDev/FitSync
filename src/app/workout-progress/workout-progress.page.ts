import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { WorkoutManagementService } from '../services/workout-management.service';
import { ProgressDataService } from '../services/progress-data.service';
import { WorkoutEventService, WorkoutCompletedEvent, WorkoutProgressUpdateEvent } from '../services/workout-event.service';
import { WorkoutProgress, WorkoutSession } from '../models/workout-system.model';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

// Interface to match what the service returns
interface WorkoutStatsData {
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  averageRating: number;
  thisWeekWorkouts: number;
  thisMonthWorkouts: number;
  currentStreak?: number;
  weeklyWorkouts?: number;
  weeklyDuration?: number;
}

interface ProgressDataPoint {
  date: Date;
  workoutsCompleted: number;
  totalDuration: number;
  totalCalories: number;
}

@Component({
  selector: 'app-workout-progress',
  templateUrl: './workout-progress.page.html',
  styleUrls: ['./workout-progress.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, DatePipe]
})
export class WorkoutProgressPage implements OnInit, OnDestroy {
  @ViewChild('weeklyChart', { static: false }) weeklyChartRef!: ElementRef;
  @ViewChild('workoutDistributionChart', { static: false }) workoutDistributionRef!: ElementRef;
  @ViewChild('progressChart', { static: false }) progressChartRef!: ElementRef;

  weeklyChart: Chart | null = null;
  workoutDistributionChart: Chart | null = null;
  progressChart: Chart | null = null;

  stats: WorkoutStatsData | null = null;
  recentSessions: WorkoutSession[] = [];
  progressData: ProgressDataPoint[] = [];

  selectedPeriod: 'week' | 'month' | 'year' = 'month';
  selectedMetric: 'frequency' | 'duration' | 'calories' = 'frequency';
  
  isLoading = true;
  private subscriptions: Subscription[] = [];
  private storage?: Storage;
  private pendingTimeouts: any[] = [];

  // Cache para evitar recálculos desnecessários e loops infinitos
  private _cachedStreakText: string = '0 dias';
  private _cachedLastWorkoutText: string = 'Nenhum treino realizado';
  private _cachedMetricLabel: string = 'Treinos Realizados';
  private _cachedAchievements: any[] = [];
  private _lastCacheUpdateData: string = '';
  private _isUpdatingCharts: boolean = false;

  constructor(
    private workoutService: WorkoutManagementService,
    private progressDataService: ProgressDataService,
    private workoutEventService: WorkoutEventService
  ) { 
    this.initStorage();
  }

  private async initStorage() {
    this.storage = new Storage();
    await this.storage.create();
  }

  async ngOnInit() {
    try {
      this.isLoading = true;
      console.log('🚀 WorkoutProgressPage ngOnInit iniciado...');
      
      // Implementar timeout para prevenir travamento
      const initPromise = Promise.race([
        this.performInitialization(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na inicialização')), 8000)
        )
      ]);

      await initPromise;
      console.log('✅ WorkoutProgressPage inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro na inicialização da WorkoutProgressPage:', error);
      this.handleInitializationError();
    } finally {
      this.isLoading = false;
    }
  }

  private async performInitialization() {
    // Carregar dados de forma assíncrona mas com timeout
    const loadDataPromise = Promise.race([
      this.loadData(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout no carregamento de dados')), 5000)
      )
    ]);

    await loadDataPromise;
    this.setupEventListeners();
  }

  private handleInitializationError() {
    console.log('🔧 Recuperando de erro de inicialização...');
    this.setDefaultStats();
    this.updateCache();
    this.isLoading = false;
  }

  ngOnDestroy() {
    console.log('💀 ngOnDestroy: Iniciando destruição completa...');
    
    try {
      // Para todas as operações em andamento
      this.isLoading = true;
      this._isUpdatingCharts = false;
      
      // Limpar todos os timeouts pendentes primeiro
      this.clearPendingTimeouts();
      
      // Destruir gráficos com proteção
      this.safeDestroyCharts();
      
      // Unsubscribe de todos os observables com proteção
      this.safeUnsubscribeAll();
      
      // Limpar dados da memória
      this.clearAllMemoryData();
      
      // Limpar cache completamente
      this.clearAllCache();
      
      console.log('🗑️ ngOnDestroy: Destruição completa finalizada');
    } catch (error) {
      console.error('Erro durante ngOnDestroy:', error);
    }
  }

  private safeDestroyCharts() {
    try {
      this.destroyCharts();
      this.clearCanvasElements();
    } catch (error) {
      console.warn('Erro ao destruir gráficos:', error);
      // Força limpeza mesmo com erro
      this.weeklyChart = null;
      this.workoutDistributionChart = null;
      this.progressChart = null;
    }
  }

  private safeUnsubscribeAll() {
    try {
      this.subscriptions.forEach(sub => {
        if (sub && !sub.closed) {
          try {
            sub.unsubscribe();
          } catch (error) {
            console.warn('Erro ao fazer unsubscribe:', error);
          }
        }
      });
      this.subscriptions = [];
    } catch (error) {
      console.warn('Erro durante unsubscribe:', error);
      this.subscriptions = [];
    }
  }

  private clearAllMemoryData() {
    try {
      this.recentSessions = [];
      this.progressData = [];
      this.stats = null;
    } catch (error) {
      console.warn('Erro ao limpar dados da memória:', error);
    }
  }

  /**
   * Configura os listeners para eventos de treino completado
   */
  private setupEventListeners(): void {
    console.log('🎯 Configurando listeners de eventos de treino...');
    
    // Listener para treino completado
    const workoutCompletedSub = this.workoutEventService.workoutCompleted$.subscribe(
      (event: WorkoutCompletedEvent) => {
        console.log('🎉 Evento de treino completado recebido:', event);
        this.handleWorkoutCompleted(event);
      }
    );

    // Listener para atualização de progresso
    const progressUpdateSub = this.workoutEventService.progressUpdate$.subscribe(
      (event: WorkoutProgressUpdateEvent) => {
        console.log('📊 Evento de atualização de progresso recebido:', event);
        this.handleProgressUpdate(event);
      }
    );

    this.subscriptions.push(workoutCompletedSub, progressUpdateSub);
  }

  /**
   * Manipula evento de treino completado
   */
  private async handleWorkoutCompleted(event: WorkoutCompletedEvent): Promise<void> {
    console.log('🔄 Processando treino completado, recarregando dados...');
    
    // Aguarda um breve momento para garantir que os dados foram persistidos
    this.safeSetTimeout(async () => {
      if (!this.isLoading) { // Só executa se a página ainda está ativa
        await this.loadData();
        this.updateChartsIfVisible();
      }
    }, 500);
  }

  /**
   * Manipula evento de atualização de progresso
   */
  private async handleProgressUpdate(event: WorkoutProgressUpdateEvent): Promise<void> {
    if (event.type === 'session_saved' || event.type === 'storage_updated') {
      console.log('💾 Dados de sessão atualizados, recarregando...');
      
      // Aguarda um momento antes de recarregar para garantir consistência
      this.safeSetTimeout(async () => {
        if (!this.isLoading) { // Só executa se a página ainda está ativa
          await this.loadData();
          this.updateChartsIfVisible();
        }
      }, 300);
    }
  }

  /**
   * Atualiza gráficos se a página estiver visível
   */
  private updateChartsIfVisible(): void {
    if (!this.isLoading && this.stats && !this._isUpdatingCharts) {
      console.log('📊 Atualizando gráficos após evento...');
      this.safeSetTimeout(() => {
        if (!this.isLoading && this.stats) { // Dupla verificação
          this.createCharts();
        }
      }, 100);
    }
  }

  async ionViewDidEnter() {
    // Sempre recarregar dados quando a página for visitada para capturar novos treinos
    console.log('🔄 ionViewDidEnter: Recarregando dados...');
    await this.loadData();
    
    if (!this.isLoading && this.stats) {
      this.safeSetTimeout(() => {
        if (!this.isLoading && this.stats) { // Dupla verificação
          this.createCharts();
        }
      }, 100);
    }
  }

  ionViewWillLeave() {
    console.log('🚪 ionViewWillLeave: Iniciando limpeza da página...');
    
    // Para todas as operações pendentes
    this.isLoading = true;
    this._isUpdatingCharts = false;
    
    // Limpar todos os timers/timeouts pendentes
    this.clearPendingTimeouts();
    
    // Destruir gráficos imediatamente
    this.destroyCharts();
    
    // Unsubscribe de todos os observables
    this.subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];
    
    // Limpar dados grandes da memória
    this.recentSessions = [];
    this.progressData = [];
    this.stats = null;
    
    // Limpar cache
    this._lastCacheUpdateData = '';
    this._cachedStreakText = '0 dias';
    this._cachedLastWorkoutText = 'Nenhum treino realizado';
    this._cachedMetricLabel = 'Treinos Realizados';
    this._cachedAchievements = [];
    
    console.log('🧹 ionViewWillLeave: Limpeza completa realizada');
  }

  // Métodos para mudança de período e métrica
  async onPeriodChange() {
    console.log('Period changed to:', this.selectedPeriod);
    this.progressData = []; // Limpar dados existentes
    await this.loadData(); // Recarregar dados
  }

  async onMetricChange() {
    console.log('Metric changed to:', this.selectedMetric);
    this._lastCacheUpdateData = ''; // Invalidar cache
    this.updateCache(); // Atualizar cache
    
    // Atualizar apenas o gráfico de progresso (que depende da métrica)
    if (!this._isUpdatingCharts) {
      this._isUpdatingCharts = true;
      setTimeout(() => {
        if (this.progressChart) {
          try {
            this.progressChart.destroy();
          } catch (e) {
            console.warn('Error destroying progress chart during metric change:', e);
          }
          this.progressChart = null;
        }
        
        setTimeout(() => {
          this.createProgressChart();
          this._isUpdatingCharts = false;
        }, 100);
      }, 100);
    }
  }  async loadData() {
    try {
      this.isLoading = true;
      console.log('LoadData: Starting to load data using home page logic...');
      
      // Usar prioritariamente a lógica da página home
      await this.loadDataFromHomePageLogic();
      
      // Se não há dados, tentar carregar do ProgressDataService como fallback
      if (!this.stats || this.recentSessions.length === 0) {
        console.log('LoadData: No data from home logic, trying ProgressDataService...');
        await this.progressDataService.init();
        await this.loadDataFromProgressService();
      }
      
      // Se ainda não há dados, tentar WorkoutManagementService como segundo fallback
      if (!this.stats || this.recentSessions.length === 0) {
        console.log('LoadData: No data from ProgressDataService, trying WorkoutManagementService...');
        await this.loadDataFromWorkoutService();
      }

      // Se ainda não há dados, adicionar dados mockados APENAS em último caso
      if (!this.stats || this.recentSessions.length === 0) {
        console.log('LoadData: No real data found, adding mock data...');
        this.addMockData();
      }

      // Atualizar cache após carregar dados
      this.updateCache();

      console.log('LoadData: Final stats:', this.stats);
      console.log('LoadData: Final progressData length:', this.progressData.length);

      this.isLoading = false;
      
      // Criar gráficos após carregar dados
      this.safeSetTimeout(() => {
        if (this.stats && !this.isLoading) {
          this.createCharts();
        }
      }, 100);

    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
      // Em caso de erro, usar dados padrão em vez de mock
      console.log('LoadData: Error occurred, setting default stats...');
      this.setDefaultStats();
      this.updateCache();
      this.isLoading = false;
      
      this.safeSetTimeout(() => {
        if (!this.isLoading) {
          this.createCharts();
        }
      }, 100);
    }
  }

  // Novo método para carregar dados usando a mesma lógica da página home
  private async loadDataFromHomePageLogic() {
    try {
      console.log('Carregando dados usando lógica da página home...');
      const startTime = performance.now();
      
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Timeout protection - se demorar mais que 2 segundos, usar valores padrão
      const loadStatsWithTimeout = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('Timeout ao carregar estatísticas, usando valores padrão');
          this.setDefaultStats();
          resolve();
        }, 2000);

        this.loadStatsInternalFromStorage(startOfWeek).then(() => {
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
      console.error('Erro ao carregar estatísticas:', error);
      this.setDefaultStats();
    }
  }

  // Método que replica a lógica interna da página home
  private async loadStatsInternalFromStorage(startOfWeek: Date) {
    // Garantir que o storage está inicializado
    if (!this.storage) {
      await this.initStorage();
    }

    console.log('🔍 DEBUG: Carregando dados do storage...');

    // Ler de TODAS as chaves de armazenamento usadas pelos diferentes componentes
    const sessions1Promise = this.storage!.get('workoutSessions');        // usado por workout-execution e bicep-workout
    const sessions2Promise = this.storage!.get('workout_sessions');       // usado por ProgressDataService
    const sessions3Promise = this.storage!.get('workoutSessions2');       // usado por WorkoutManagementService
    const sessions4Promise = this.storage!.get('workout-history');        // usado por WorkoutCreatorService

    const [sessions1, sessions2, sessions3, sessions4] = await Promise.all([
      sessions1Promise.catch(() => []),
      sessions2Promise.catch(() => []),
      sessions3Promise.catch(() => []),
      sessions4Promise.catch(() => [])
    ]);

    console.log('🔍 DEBUG: workoutSessions encontradas:', sessions1?.length || 0);
    console.log('🔍 DEBUG: workout_sessions encontradas:', sessions2?.length || 0);
    console.log('🔍 DEBUG: workoutSessions2 encontradas:', sessions3?.length || 0);
    console.log('🔍 DEBUG: workout-history encontradas:', sessions4?.length || 0);
    
    if (sessions1?.length > 0) {
      console.log('🔍 DEBUG: Primeira sessão de workoutSessions:', sessions1[0]);
    }
    if (sessions2?.length > 0) {
      console.log('🔍 DEBUG: Primeira sessão de workout_sessions:', sessions2[0]);
    }
    if (sessions3?.length > 0) {
      console.log('🔍 DEBUG: Primeira sessão de workoutSessions2:', sessions3[0]);
    }
    if (sessions4?.length > 0) {
      console.log('🔍 DEBUG: Primeira sessão de workout-history:', sessions4[0]);
    }

    // Garantir que todos são arrays e limitar quantidade para performance
    const validSessions1 = Array.isArray(sessions1) ? sessions1.slice(0, 100) : [];
    const validSessions2 = Array.isArray(sessions2) ? sessions2.slice(0, 100) : [];
    const validSessions3 = Array.isArray(sessions3) ? sessions3.slice(0, 100) : [];
    const validSessions4 = Array.isArray(sessions4) ? sessions4.slice(0, 100) : [];

    // Combinar as sessões de TODAS as fontes
    const allSessions = [...validSessions1, ...validSessions2, ...validSessions3, ...validSessions4];
    console.log('🔍 DEBUG: Total de sessões combinadas:', allSessions.length);

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

    console.log('🔍 DEBUG: Sessões desta semana (filtradas):', thisWeekSessions.length);
    if (thisWeekSessions.length > 0) {
      console.log('🔍 DEBUG: Sessões desta semana:', thisWeekSessions.map(s => ({
        id: s.id,
        workoutId: s.workoutId,
        startTime: s.startTime,
        status: s.status,
        duration: s.duration
      })));
    }

    // Limitar processamento para performance
    const limitedSessions = thisWeekSessions.slice(0, 50);

    // Remover duplicatas com algoritmo otimizado (mesmo da home page)
    const uniqueSessions = this.removeDuplicateSessions(limitedSessions);

    console.log('🔍 DEBUG: Sessões únicas após remoção de duplicatas:', uniqueSessions.length);
    if (uniqueSessions.length > 0) {
      console.log('🔍 DEBUG: Sessões únicas:', uniqueSessions.map(s => ({
        id: s.id,
        workoutId: s.workoutId,
        startTime: s.startTime,
        duration: s.duration,
        caloriesBurned: s.caloriesBurned
      })));
    }

    // Converter para o formato esperado pela página workout-progress
    this.recentSessions = uniqueSessions.map((session: any) => ({
      id: session.id || `session-${Date.now()}-${Math.random()}`,
      workoutId: session.workoutId || `workout-${session.id}`,
      userId: session.userId || 'current-user',
      startTime: new Date(session.startTime || session.date),
      endTime: session.endTime ? new Date(session.endTime) : new Date(new Date(session.startTime || session.date).getTime() + (session.duration * 60000)),
      duration: session.duration || 0,
      exercises: session.exercises || [],
      status: session.status || 'completed',
      caloriesBurned: session.caloriesBurned || 0,
      dayOfWeek: session.dayOfWeek || new Date(session.startTime || session.date).toLocaleDateString('pt-BR', { weekday: 'long' })
    }));

    console.log('🔍 DEBUG: recentSessions final:', this.recentSessions.length);
    if (this.recentSessions.length > 0) {
      console.log('🔍 DEBUG: Primeira sessão final:', this.recentSessions[0]);
    }

    // Calcular estatísticas usando os mesmos métodos da página home
    const weeklyWorkouts = uniqueSessions.length;
    const weeklyMinutes = this.calculateTotalMinutes(uniqueSessions);
    const weeklyCalories = this.calculateTotalCalories(uniqueSessions);

    // Atualizar stats com os dados calculados
    this.stats = {
      totalWorkouts: weeklyWorkouts,
      totalDuration: weeklyMinutes,
      totalCalories: weeklyCalories,
      averageRating: 4.5, // Valor padrão
      thisWeekWorkouts: weeklyWorkouts,
      thisMonthWorkouts: weeklyWorkouts, // Simplificado por enquanto
      currentStreak: 0, // Pode ser calculado depois
      weeklyWorkouts: weeklyWorkouts,
      weeklyDuration: weeklyMinutes * 60 // Converter para segundos para compatibilidade com formatDuration
    };

    // Se não há dados reais, adicionar dados de demonstração
    if (weeklyWorkouts === 0) {
      this.stats = {
        totalWorkouts: 3,
        totalDuration: 180, // 3 horas em minutos
        totalCalories: 450,
        averageRating: 4.5,
        thisWeekWorkouts: 3,
        thisMonthWorkouts: 3,
        currentStreak: 2,
        weeklyWorkouts: 3,
        weeklyDuration: 180 * 60 // 3 horas em segundos
      };
    }

    // Gerar dados de progresso baseados nas sessões
    this.generateProgressDataFromSessions(uniqueSessions);

    console.log('Estatísticas calculadas (mesma lógica da home):', {
      totalSessions: allSessions.length,
      thisWeekSessions: thisWeekSessions.length,
      uniqueSessions: uniqueSessions.length,
      weeklyWorkouts: weeklyWorkouts,
      weeklyMinutes: weeklyMinutes,
      weeklyCalories: weeklyCalories
    });
  }

  // Método para remover duplicatas (mesmo da página home)
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

  // Método para calcular minutos totais (mesmo da página home)
  private calculateTotalMinutes(sessions: any[]): number {
    return sessions.reduce((total: number, session: any) => {
      const duration = session.duration || 0;
      return total + (typeof duration === 'number' ? Math.max(0, Math.min(duration, 300)) : 0); // Limitar a 300 min por sessão
    }, 0);
  }

  // Método para calcular calorias totais (mesmo da página home)
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

  // Método para definir estatísticas padrão
  private setDefaultStats() {
    this.stats = {
      totalWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      averageRating: 0,
      thisWeekWorkouts: 0,
      thisMonthWorkouts: 0,
      currentStreak: 0,
      weeklyWorkouts: 0,
      weeklyDuration: 0
    };
    this.recentSessions = [];
    this.progressData = [];
    console.log('Estatísticas padrão definidas');
  }

  // Método para gerar dados de progresso baseados nas sessões
  private generateProgressDataFromSessions(sessions: any[]) {
    const progressMap = new Map<string, ProgressDataPoint>();
    
    sessions.forEach(session => {
      const sessionDate = new Date(session.startTime || session.date);
      const dateKey = sessionDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!progressMap.has(dateKey)) {
        progressMap.set(dateKey, {
          date: sessionDate,
          workoutsCompleted: 0,
          totalDuration: 0,
          totalCalories: 0
        });
      }
      
      const progressPoint = progressMap.get(dateKey)!;
      progressPoint.workoutsCompleted += 1;
      progressPoint.totalDuration += session.duration || 0;
      progressPoint.totalCalories += session.caloriesBurned || this.calculateSessionCalories(session);
    });
    
    this.progressData = Array.from(progressMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Método auxiliar para calcular calorias de uma sessão
  private calculateSessionCalories(session: any): number {
    if (session.exercises && Array.isArray(session.exercises)) {
      return session.exercises.reduce((total: number, exercise: any) => {
        return total + (exercise.calories || 50);
      }, 0);
    }
    return 150; // Valor padrão
  }

  // Novo método para carregar dados do ProgressDataService (mantido como fallback)
  private async loadDataFromProgressService() {
    try {
      // Carregar dados das sessões do ProgressDataService com subscription gerenciada
      const sessionsSubscription = this.progressDataService.workoutSessions$.subscribe(sessions => {
        if (sessions.length > 0) {
          // Converter formato do ProgressDataService para o formato esperado
          this.recentSessions = sessions.map(session => ({
            id: session.id,
            workoutId: `workout-${session.id}`,
            userId: 'current-user',
            startTime: new Date(session.date),
            endTime: new Date(new Date(session.date).getTime() + (session.duration * 60000)),
            duration: session.duration,
            exercises: session.exercises.map(exercise => ({
              exerciseId: exercise.exerciseId,
              sets: exercise.sets.map(set => ({
                reps: set.reps || 0,
                weight: set.weight || 0,
                completed: true,
                startTime: new Date(),
                endTime: new Date()
              })),
              restTimes: [],
              startTime: new Date(session.date),
              endTime: new Date(session.date)
            })),
            status: 'completed' as const,
            caloriesBurned: 0,
            notes: session.notes,
            rating: 5,
            dayOfWeek: new Date(session.date).toLocaleDateString('pt-BR', { weekday: 'long' })
          }))
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .slice(0, 10);

          // Gerar dados de progresso
          this.progressData = this.generateProgressDataFromProgressService(sessions);
          
          // Invalidar cache para forçar recálculo
          this._lastCacheUpdateData = '';
        }
      });
      
      this.subscriptions.push(sessionsSubscription);

      // Carregar estatísticas do ProgressDataService com subscription gerenciada
      const statsSubscription = this.progressDataService.progressStats$.subscribe(progressStats => {
        if (progressStats) {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const weeklySessions = this.recentSessions.filter(session =>
            new Date(session.startTime) >= weekAgo
          );

          this.stats = {
            totalWorkouts: progressStats.totalWorkouts,
            totalDuration: progressStats.totalWorkouts > 0 ? progressStats.averageWorkoutDuration * progressStats.totalWorkouts : 0,
            totalCalories: 0, // Calorias ainda não implementadas no ProgressDataService
            averageRating: 5,
            thisWeekWorkouts: weeklySessions.length,
            thisMonthWorkouts: this.recentSessions.filter(s => {
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return new Date(s.startTime) >= monthAgo;
            }).length,
            currentStreak: progressStats.currentStreak || 0,
            weeklyWorkouts: weeklySessions.length,
            weeklyDuration: weeklySessions.reduce((sum, s) => sum + (s.duration || 0), 0)
          };
          
          // Invalidar cache para forçar recálculo
          this._lastCacheUpdateData = '';
        }
      });

      this.subscriptions.push(statsSubscription);

    } catch (error) {
      console.error('Erro ao carregar dados do ProgressDataService:', error);
    }
  }

  // Método para carregar dados do WorkoutManagementService como fallback
  private async loadDataFromWorkoutService() {
    try {
      const sessionsSubscription = this.workoutService.getUserWorkoutSessions().subscribe(sessions => {
        this.recentSessions = sessions
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .slice(0, 10);

        // Calculate weekly stats from sessions
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklySessions = this.recentSessions.filter(session =>
          new Date(session.startTime) >= weekAgo
        );

        // Get stats using the existing method and enhance with weekly data
        if (!this.stats) {
          const statsSubscription = this.workoutService.getWorkoutStats().subscribe(stats => {
            this.stats = {
              ...stats,
              currentStreak: this.calculateCurrentStreak(),
              weeklyWorkouts: weeklySessions.length,
              weeklyDuration: weeklySessions.reduce((sum, s) => sum + (s.duration || 0), 0)
            };
            
            // Invalidar cache para forçar recálculo
            this._lastCacheUpdateData = '';
          });
          this.subscriptions.push(statsSubscription);
        }

        // Generate progress data from sessions if not already loaded
        if (this.progressData.length === 0) {
          this.progressData = this.generateProgressData(this.recentSessions);
        }
        
        // Invalidar cache para forçar recálculo
        this._lastCacheUpdateData = '';
      });

      this.subscriptions.push(sessionsSubscription);

    } catch (error) {
      console.error('Erro ao carregar dados do WorkoutManagementService:', error);
    }
  }

  // Método para gerar dados de progresso a partir do ProgressDataService
  private generateProgressDataFromProgressService(sessions: any[]): ProgressDataPoint[] {
    const periodDays = this.selectedPeriod === 'week' ? 7 :
      this.selectedPeriod === 'month' ? 30 : 365;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    // Group sessions by date
    const sessionsByDate = new Map<string, any[]>();

    sessions
      .filter(session => new Date(session.date) >= cutoffDate)
      .forEach(session => {
        const dateKey = new Date(session.date).toDateString();
        if (!sessionsByDate.has(dateKey)) {
          sessionsByDate.set(dateKey, []);
        }
        sessionsByDate.get(dateKey)!.push(session);
      });

    // Convert to progress data points
    return Array.from(sessionsByDate.entries()).map(([dateKey, daySessions]) => ({
      date: new Date(dateKey),
      workoutsCompleted: daySessions.length,
      totalDuration: daySessions.reduce((sum, s) => sum + s.duration, 0),
      totalCalories: 0 // Não implementado ainda
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Método para adicionar dados mockados quando não há dados reais
  private addMockData() {
    console.log('Adding mock data for demonstration...', 'Period:', this.selectedPeriod);
    
    // Mock stats baseado no período selecionado
    const multiplier = this.selectedPeriod === 'week' ? 1 : 
                      this.selectedPeriod === 'month' ? 4 : 
                      48; // year (52 weeks ≈ 48 for simplicity)

    this.stats = {
      totalWorkouts: 15 * multiplier,
      totalDuration: 1200 * multiplier, // horas convertidas para minutos
      totalCalories: 3500 * multiplier,
      averageRating: 4.5,
      thisWeekWorkouts: 3,
      thisMonthWorkouts: 12,
      currentStreak: 5,
      weeklyWorkouts: 3,
      weeklyDuration: 180 // 3 horas
    };

    // Mock recent sessions baseado no período
    const now = new Date();
    this.recentSessions = [];
    const sessionCount = this.selectedPeriod === 'week' ? 10 : 
                        this.selectedPeriod === 'month' ? 30 : 
                        90; // 3 meses de dados para year
    
    for (let i = 0; i < sessionCount; i++) {
      const sessionDate = new Date(now);
      
      if (this.selectedPeriod === 'week') {
        sessionDate.setDate(sessionDate.getDate() - i);
      } else if (this.selectedPeriod === 'month') {
        sessionDate.setDate(sessionDate.getDate() - i);
      } else { // year
        sessionDate.setDate(sessionDate.getDate() - (i * 4)); // espaçar mais os dados
      }
      
      // Variação realística nas durações e calorias
      const duration = 30 + Math.floor(Math.random() * 60); // 30-90 min
      const calories = 150 + Math.floor(Math.random() * 400); // 150-550 calories
      
      // Array de IDs de workout mais realístico - alguns se repetem para simular uso real
      const workoutIds = [
        'chest-workout-default',    // Mais popular
        'chest-workout-default',
        'chest-workout-default',
        'legs-workout-default',     // Segunda mais popular
        'legs-workout-default',
        'legs-workout-default',
        'back-workout-default',     // Terceira mais popular
        'back-workout-default',
        'bicep-workout-default',    // Quarta mais popular
        'bicep-workout-default',
        'shoulders-workout-default', // Quinta mais popular
        'cardio-workout-intense',
        'Workout_bicep_advanced',
        'Workout-chest-intermediate',
        'bicep-wo',
        'chest-wo',
        'back-wor',
        'full-body-workout-complete'
      ];
      
      this.recentSessions.push({
        id: `mock-session-${i}`,
        workoutId: workoutIds[i % workoutIds.length], // Ciclar através dos IDs (mais realístico)
        userId: 'mock-user',
        startTime: sessionDate,
        endTime: new Date(sessionDate.getTime() + (duration * 60000)),
        duration: duration,
        exercises: [],
        status: 'completed',
        caloriesBurned: calories,
        notes: `Mock workout session ${i + 1}`,
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 rating
        dayOfWeek: sessionDate.toLocaleDateString('pt-BR', { weekday: 'long' })
      });
    }

    // Gerar dados de progresso mais realísticos baseados no período
    this.generateMockProgressData(now);
    
    console.log('Mock data added:', {
      stats: this.stats,
      sessions: this.recentSessions.length,
      progressData: this.progressData.length,
      period: this.selectedPeriod
    });
  }

  private generateMockProgressData(now: Date) {
    this.progressData = [];
    let periodDays: number;
    let dateIncrement: number;

    switch (this.selectedPeriod) {
      case 'week':
        periodDays = 7;
        dateIncrement = 1; // diário
        break;
      case 'month':
        periodDays = 30;
        dateIncrement = 1; // diário
        break;
      case 'year':
        periodDays = 52; // 52 semanas
        dateIncrement = 7; // semanal
        break;
      default:
        periodDays = 30;
        dateIncrement = 1;
    }

    for (let i = 0; i < periodDays; i++) {
      const date = new Date(now);
      
      if (this.selectedPeriod === 'year') {
        date.setDate(date.getDate() - (i * dateIncrement));
      } else {
        date.setDate(date.getDate() - i);
      }
      
      // Gerar dados mais realísticos baseados no dia da semana
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Menos treinos nos finais de semana
      const workoutProbability = isWeekend ? 0.3 : 0.7;
      const hasWorkout = Math.random() < workoutProbability;
      
      let workoutsCompleted = 0;
      let totalDuration = 0;
      let totalCalories = 0;

      if (hasWorkout) {
        // Para período anual, pode ter mais de um treino por "ponto" (semana)
        const maxWorkouts = this.selectedPeriod === 'year' ? 
          Math.floor(Math.random() * 5) + 1 : // 1-5 treinos por semana
          Math.floor(Math.random() * 2) + 1;   // 1-2 treinos por dia

        workoutsCompleted = maxWorkouts;
        
        for (let w = 0; w < workoutsCompleted; w++) {
          const workoutDuration = 30 + Math.floor(Math.random() * 60); // 30-90 min
          const workoutCalories = 150 + Math.floor(Math.random() * 400); // 150-550 cal
          
          totalDuration += workoutDuration;
          totalCalories += workoutCalories;
        }
      }
      
      this.progressData.push({
        date: date,
        workoutsCompleted: workoutsCompleted,
        totalDuration: totalDuration,
        totalCalories: totalCalories
      });
    }

    this.progressData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Generate progress data from workout sessions
  private generateProgressData(sessions: WorkoutSession[]): ProgressDataPoint[] {
    const periodDays = this.selectedPeriod === 'week' ? 7 :
      this.selectedPeriod === 'month' ? 30 : 365;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    // Group sessions by date
    const sessionsByDate = new Map<string, WorkoutSession[]>();

    sessions
      .filter(session => new Date(session.startTime) >= cutoffDate)
      .forEach(session => {
        const dateKey = new Date(session.startTime).toDateString();
        if (!sessionsByDate.has(dateKey)) {
          sessionsByDate.set(dateKey, []);
        }
        sessionsByDate.get(dateKey)!.push(session);
      });

    // Convert to progress data points
    return Array.from(sessionsByDate.entries()).map(([dateKey, daySessions]) => ({
      date: new Date(dateKey),
      workoutsCompleted: daySessions.length,
      totalDuration: daySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      totalCalories: daySessions.reduce((sum, s) => sum + 0, 0) // WorkoutSession model doesn't have calories
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Calculate current streak from sessions
  private calculateCurrentStreak(): number {
    if (!this.recentSessions.length) return 0;

    const sortedSessions = [...this.recentSessions]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff === streak + 1) {
        // Allow for one day gap (today vs yesterday)
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private createCharts() {
    console.log('CreateCharts: Starting chart creation...');
    
    // Prevent creation if already updating
    if (this._isUpdatingCharts) {
      console.log('CreateCharts: Already updating, skipping...');
      return;
    }

    // Ensure we have data to display
    if (!this.stats) {
      console.log('CreateCharts: No stats available, adding mock data first...');
      this.addMockData();
    }

    // Ensure all ViewChild elements are available
    if (!this.weeklyChartRef || !this.workoutDistributionRef || !this.progressChartRef) {
      console.warn('CreateCharts: Canvas elements not yet available, retrying...');
      this.safeSetTimeout(() => {
        if (!this.isLoading) {
          this.createCharts();
        }
      }, 200);
      return;
    }

    console.log('CreateCharts: All canvas elements available, proceeding...');

    // Set updating flag
    this._isUpdatingCharts = true;

    // Destroy any existing charts first
    this.destroyCharts();

    // Wait for destruction to complete before creating new charts
    this.safeSetTimeout(() => {
      if (this.isLoading) return; // Página foi destruída
      
      console.log('CreateCharts: Creating individual charts...');
      
      try {
        this.createWeeklyChart();
        this.createWorkoutDistributionChart();
        this.createProgressChart();
        console.log('CreateCharts: All charts created successfully');
      } catch (error) {
        console.error('CreateCharts: Error creating charts:', error);
      } finally {
        this._isUpdatingCharts = false;
      }
    }, 100);
  }

  private createWeeklyChart() {
    if (!this.weeklyChartRef) {
      console.log('WeeklyChart: Chart ref not available');
      return;
    }

    console.log('WeeklyChart: Creating chart with stats:', this.stats);

    // Ensure no existing chart instance
    if (this.weeklyChart) {
      try {
        this.weeklyChart.destroy();
      } catch (e) {
        console.warn('Error destroying existing weekly chart:', e);
      }
      this.weeklyChart = null;
    }

    const ctx = this.weeklyChartRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.log('WeeklyChart: Could not get canvas context');
      return;
    }

    const data = this.getWeeklyData();
    console.log('WeeklyChart: Using data:', data);

    this.weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        datasets: [{
          label: 'Treinos por Dia',
          data: data,
          backgroundColor: '#9ca3af',
          borderColor: 'var(--ion-color-primary)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: '#6b7280',
          hoverBorderColor: 'var(--ion-color-primary-shade)',
          hoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
            labels: {
              color: 'var(--ion-color-light)'
            }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#f9fafb',
            borderColor: 'var(--ion-color-primary)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#9ca3af'
            },
            grid: {
              color: 'rgba(156, 163, 175, 0.2)'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#9ca3af'
            },
            grid: {
              color: 'rgba(156, 163, 175, 0.2)'
            }
          }
        }
      }
    });
  }

  private createWorkoutDistributionChart() {
    console.log('=== DISTRIBUIÇÃO CHART DEBUG ===');
    console.log('workoutDistributionRef exists:', !!this.workoutDistributionRef);
    console.log('Stats available:', !!this.stats);
    console.log('Recent sessions count:', this.recentSessions.length);
    
    if (!this.workoutDistributionRef) {
      console.log('DistributionChart: Chart ref not available');
      return;
    }

    console.log('DistributionChart: Creating chart with stats:', this.stats);

    // Ensure no existing chart instance
    if (this.workoutDistributionChart) {
      try {
        this.workoutDistributionChart.destroy();
      } catch (e) {
        console.warn('Error destroying existing workout distribution chart:', e);
      }
      this.workoutDistributionChart = null;
    }

    const ctx = this.workoutDistributionRef.nativeElement.getContext('2d');
    if (!ctx) {
      console.log('DistributionChart: Could not get canvas context');
      return;
    }

    const workoutTypes = this.getWorkoutTypeDistribution();
    console.log('DistributionChart: Final chart data:', workoutTypes);
    console.log('DistributionChart: Labels array:', workoutTypes.labels);
    console.log('DistributionChart: Data array:', workoutTypes.data);

    this.workoutDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: workoutTypes.labels,
        datasets: [{
          data: workoutTypes.data,
          backgroundColor: [
            '#9ca3af',
            '#6b7280',
            '#4b5563',
            '#374151',
            '#1f2937'
          ],
          borderWidth: 3,
          borderColor: [
            'var(--ion-color-primary)',
            'var(--ion-color-secondary)',
            'var(--ion-color-tertiary)',
            'var(--ion-color-success)',
            'var(--ion-color-warning)'
          ],
          hoverBackgroundColor: [
            '#d1d5db',
            '#9ca3af',
            '#6b7280',
            '#4b5563',
            '#374151'
          ],
          hoverBorderWidth: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#9ca3af',
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#f9fafb',
            borderColor: 'var(--ion-color-primary)',
            borderWidth: 1
          }
        }
      }
    });
  }

  private createProgressChart() {
    if (!this.progressChartRef) {
      console.log('ProgressChart: Chart ref not available');
      return;
    }
    
    // Always try to get chart data, even if progressData is empty
    const chartData = this.getProgressChartData();
    
    console.log('ProgressChart: Creating chart with data:', chartData);
    
    // Destroy existing chart if it exists
    if (this.progressChart) {
      try {
        this.progressChart.destroy();
      } catch (e) {
        console.warn('Error destroying existing progress chart:', e);
      }
      this.progressChart = null;
    }

    const ctx = this.progressChartRef.nativeElement.getContext('2d');

    this.progressChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: this.getMetricLabel(),
          data: chartData.data,
          borderColor: 'var(--ion-color-primary)',
          backgroundColor: 'rgba(156, 163, 175, 0.3)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#9ca3af',
          pointBorderColor: 'var(--ion-color-primary)',
          pointBorderWidth: 3,
          pointRadius: 7,
          pointHoverBackgroundColor: '#6b7280',
          pointHoverBorderColor: 'var(--ion-color-primary)',
          pointHoverBorderWidth: 4,
          pointHoverRadius: 9
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
            labels: {
              color: 'var(--ion-color-light)'
            }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f9fafb',
            bodyColor: '#f9fafb',
            borderColor: 'var(--ion-color-primary)',
            borderWidth: 1,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(156, 163, 175, 0.2)'
            },
            ticks: {
              color: '#9ca3af'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(156, 163, 175, 0.2)'
            },
            ticks: {
              color: '#9ca3af'
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  private updateCharts() {
    // Evitar loops infinitos durante atualização
    if (this._isUpdatingCharts) return;
    
    this.destroyCharts();
    this.safeSetTimeout(() => {
      if (!this.isLoading) {
        this.createCharts();
      }
    }, 100);
  }

  private updateChartsWithCache() {
    // Método otimizado que usa cache e evita loops
    if (this._isUpdatingCharts) return;
    
    this.destroyCharts();
    this.safeSetTimeout(() => {
      if (this.stats && !this._isUpdatingCharts && !this.isLoading) {
        this.createCharts();
      }
    }, 150);
  }

  private destroyCharts() {
    console.log('DestroyCharts: Destroying existing charts...');
    
    try {
      // Destroy charts with proper error handling
      if (this.progressChart) {
        try {
          this.progressChart.destroy();
          console.log('DestroyCharts: Progress chart destroyed');
        } catch (e) {
          console.warn('Error destroying progress chart:', e);
        }
        this.progressChart = null;
      }
      
      if (this.workoutDistributionChart) {
        try {
          this.workoutDistributionChart.destroy();
          console.log('DestroyCharts: Distribution chart destroyed');
        } catch (e) {
          console.warn('Error destroying workout distribution chart:', e);
        }
        this.workoutDistributionChart = null;
      }
      
      if (this.weeklyChart) {
        try {
          this.weeklyChart.destroy();
          console.log('DestroyCharts: Weekly chart destroyed');
        } catch (e) {
          console.warn('Error destroying weekly chart:', e);
        }
        this.weeklyChart = null;
      }

      console.log('DestroyCharts: All charts destroyed');
      
    } catch (error) {
      console.warn('DestroyCharts: Error during destruction:', error);
      // Force clear the charts even if destruction fails
      this.weeklyChart = null;
      this.workoutDistributionChart = null;
      this.progressChart = null;
    }
  }

  private clearCanvasElements() {
    try {
      // Clear weekly chart canvas
      if (this.weeklyChartRef?.nativeElement) {
        const weeklyCtx = this.weeklyChartRef.nativeElement.getContext('2d');
        if (weeklyCtx) {
          weeklyCtx.clearRect(0, 0, this.weeklyChartRef.nativeElement.width, this.weeklyChartRef.nativeElement.height);
        }
      }

      // Clear workout distribution chart canvas
      if (this.workoutDistributionRef?.nativeElement) {
        const distributionCtx = this.workoutDistributionRef.nativeElement.getContext('2d');
        if (distributionCtx) {
          distributionCtx.clearRect(0, 0, this.workoutDistributionRef.nativeElement.width, this.workoutDistributionRef.nativeElement.height);
        }
      }

      // Clear progress chart canvas
      if (this.progressChartRef?.nativeElement) {
        const progressCtx = this.progressChartRef.nativeElement.getContext('2d');
        if (progressCtx) {
          progressCtx.clearRect(0, 0, this.progressChartRef.nativeElement.width, this.progressChartRef.nativeElement.height);
        }
      }
    } catch (error) {
      console.warn('Erro ao limpar elementos canvas:', error);
    }
  }

  /**
   * Limpa todos os timeouts pendentes para evitar callbacks órfãos
   */
  private clearPendingTimeouts() {
    console.log(`🔥 Limpando ${this.pendingTimeouts.length} timeouts pendentes...`);
    this.pendingTimeouts.forEach(timeout => {
      try {
        clearTimeout(timeout);
      } catch (error) {
        console.warn('Erro ao limpar timeout:', error);
      }
    });
    this.pendingTimeouts = [];
  }

  /**
   * Wrapper para setTimeout que rastreia timeouts pendentes
   */
  private safeSetTimeout(callback: () => void, delay: number): any {
    const timeout = setTimeout(() => {
      try {
        // Remove da lista de timeouts pendentes
        const index = this.pendingTimeouts.indexOf(timeout);
        if (index > -1) {
          this.pendingTimeouts.splice(index, 1);
        }
        
        // Executa callback se a página ainda existe
        if (!this.isLoading || this.stats) {
          callback();
        }
      } catch (error) {
        console.warn('Erro no callback de timeout:', error);
      }
    }, delay);
    
    this.pendingTimeouts.push(timeout);
    return timeout;
  }

  /**
   * Limpa todo o cache da página
   */
  private clearAllCache() {
    this._lastCacheUpdateData = '';
    this._cachedStreakText = '0 dias';
    this._cachedLastWorkoutText = 'Nenhum treino realizado';
    this._cachedMetricLabel = 'Treinos Realizados';
    this._cachedAchievements = [];
    console.log('🗃️ Cache completamente limpo');
  }

  private getWeeklyData(): number[] {
    if (!this.stats) return [0, 0, 0, 0, 0, 0, 0];

    // Simular dados semanais baseados nas sessões recentes
    const weekData = [0, 0, 0, 0, 0, 0, 0];

    this.recentSessions.forEach(session => {
      const dayOfWeek = new Date(session.startTime).getDay();
      weekData[dayOfWeek]++;
    });

    console.log('Weekly data calculated:', weekData);
    
    // Se não há dados reais, retornar dados mock para demonstração
    if (weekData.every(val => val === 0)) {
      console.log('No weekly data found, returning mock data');
      return [1, 2, 1, 3, 2, 1, 0]; // Mock weekly data
    }

    return weekData;
  }

  private getWorkoutTypeDistribution() {
    const distribution: { [key: string]: number } = {};

    console.log('=== DEBUG: getWorkoutTypeDistribution ===');
    console.log('Processing workout sessions for distribution:', this.recentSessions.length, 'sessions');
    console.log('Recent sessions structure (first 3):', this.recentSessions.slice(0, 3));
    
    // Log ALL sessions to identify where strange IDs come from
    console.log('=== ALL SESSIONS DETAILED ANALYSIS ===');
    this.recentSessions.forEach((session, index) => {
      console.log(`Session ${index + 1}:`, {
        id: session.id,
        workoutId: session.workoutId,
        dayOfWeek: session.dayOfWeek,
        startTime: session.startTime,
        duration: session.duration,
        fullSessionData: session // Show complete session object
      });
      
      // Check if the ID looks like a random generated ID
      if (session.workoutId && typeof session.workoutId === 'string') {
        if (session.workoutId.length > 20 && /[0-9a-z]{15,}/.test(session.workoutId)) {
          console.error(`🚨 FOUND SUSPICIOUS ID: "${session.workoutId}" - This looks like a generated ID, not a proper workout type!`);
          console.error('   Session details:', session);
        }
      }
      
      // Verificar se workoutId existe e não é undefined
      if (!session.workoutId) {
        console.warn(`Session ${index + 1} has no workoutId:`, session);
        return;
      }
      
      // IMPORTANT: Use ONLY workoutId, never dayOfWeek for workout type distribution
      const workoutType = session.workoutId;
      
      // Enhanced validation that we're not accidentally using dayOfWeek data
      const dayOfWeekPatterns = [
        'feira', 'domingo', 'sábado', 'sabado',
        'segunda', 'terça', 'quarta', 'quinta', 'sexta',
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ];
      
      if (typeof workoutType === 'string') {
        const lowerCaseType = workoutType.toLowerCase();
        for (const pattern of dayOfWeekPatterns) {
          if (lowerCaseType.includes(pattern.toLowerCase())) {
            console.error(`CRITICAL ERROR: Using dayOfWeek "${workoutType}" instead of workoutId for session:`, session);
            return; // Skip this session to prevent contamination
          }
        }
      }
      
      // ADDITIONAL VALIDATION: Skip suspicious random IDs
      if (typeof workoutType === 'string' && workoutType.length > 20 && /[0-9a-z]{15,}/.test(workoutType)) {
        console.error(`SKIPPING SUSPICIOUS ID: "${workoutType}" - This appears to be a generated ID, not a workout type`);
        return;
      }
      
      distribution[workoutType] = (distribution[workoutType] || 0) + 1;
      
      console.log(`  -> Mapped "${workoutType}" to count: ${distribution[workoutType]}`);
    });

    console.log('Final raw distribution:', distribution);

    // Se não há dados reais, retornar dados mock
    if (Object.keys(distribution).length === 0) {
      console.log('No workout distribution data found, returning mock data');
      return {
        labels: ['Peito', 'Costas', 'Pernas', 'Braços', 'Core'],
        data: [4, 3, 5, 2, 1]
      };
    }

    // Converter os IDs dos treinos para nomes simples
    const simplifiedDistribution: { [key: string]: number } = {};
    
    Object.keys(distribution).forEach(workoutId => {
      console.log(`Processing workoutId: "${workoutId}"`);
      const simplifiedName = this.simplifyWorkoutTypeName(workoutId);
      console.log(`  -> Simplified to: "${simplifiedName}"`);
      simplifiedDistribution[simplifiedName] = (simplifiedDistribution[simplifiedName] || 0) + distribution[workoutId];
    });

    console.log('Final simplified distribution:', simplifiedDistribution);
    console.log('Final labels:', Object.keys(simplifiedDistribution));
    console.log('Final data:', Object.values(simplifiedDistribution));

    return {
      labels: Object.keys(simplifiedDistribution),
      data: Object.values(simplifiedDistribution)
    };
  }

  private simplifyWorkoutTypeName(workoutId: string): string {
    console.log(`Simplifying workout name: "${workoutId}"`);
    
    // CRITICAL: Enhanced validation to ensure we're not processing dayOfWeek data
    // Check for all possible day names in Portuguese
    const dayOfWeekPatterns = [
      'feira',      // segunda-feira, terça-feira, etc.
      'domingo',    // domingo
      'sábado',     // sábado  
      'segunda',    // segunda (abbreviation)
      'terça',      // terça (abbreviation)
      'quarta',     // quarta (abbreviation)
      'quinta',     // quinta (abbreviation)
      'sexta',      // sexta (abbreviation)
      'sabado',     // sabado (without accent)
      'Monday',     // English days
      'Tuesday',
      'Wednesday', 
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];
    
    if (typeof workoutId === 'string') {
      const lowerCaseId = workoutId.toLowerCase();
      for (const pattern of dayOfWeekPatterns) {
        if (lowerCaseId.includes(pattern.toLowerCase())) {
          console.error(`CRITICAL ERROR: Attempted to simplify dayOfWeek "${workoutId}" as workout type`);
          return 'Tipo Inválido'; // Return clear error indicator
        }
      }
    }
    
    // Mapeamento de IDs de treino para nomes simples (incluindo IDs completos)
    const workoutNameMap: { [key: string]: string } = {
      // IDs exatos conhecidos - Patterns with chest
      'chest-workout-default': 'Peito',
      'chest-workout': 'Peito',
      'chest-wo': 'Peito',
      'chest': 'Peito',
      'Workout-chest-intermediate': 'Peito',
      'Workout_chest_intermediate': 'Peito',
      
      // Patterns with legs
      'legs-workout-default': 'Pernas',
      'legs-workout': 'Pernas',
      'legs-wor': 'Pernas',
      'legs-w': 'Pernas',
      'legs': 'Pernas',
      
      // Patterns with back
      'back-workout-default': 'Costas',
      'back-workout': 'Costas',
      'back-wor': 'Costas',
      'back': 'Costas',
      
      // Patterns with bicep
      'bicep-workout-default': 'Bíceps',
      'bicep-workout': 'Bíceps',
      'bicep-wo': 'Bíceps',
      'bicep': 'Bíceps',
      'Workout_bicep_advanced': 'Bíceps',
      'Workout-bicep-advanced': 'Bíceps',
      
      // Patterns with shoulders
      'shoulders-workout-default': 'Ombros',
      'shoulders-workout': 'Ombros',
      'shoulders': 'Ombros',
      'shoulder': 'Ombros',
      
      // Patterns with tricep
      'tricep-workout-default': 'Tríceps',
      'tricep-workout': 'Tríceps',
      'tricep-w': 'Tríceps',
      'tricep': 'Tríceps',
      
      // Patterns with core
      'core-workout-default': 'Core',
      'core-workout': 'Core',
      'core-wor': 'Core',
      'core': 'Core',
      
      // Patterns with cardio
      'cardio-workout-default': 'Cardio',
      'cardio-workout': 'Cardio',
      'cardio-w': 'Cardio',
      'cardio': 'Cardio',
      'cardio-workout-intense': 'Cardio',
      
      // Full body patterns
      'full-body': 'Corpo Inteiro',
      'full-body-workout': 'Corpo Inteiro',
      'full-body-workout-complete': 'Corpo Inteiro',
      
      // Strength patterns
      'strength': 'Força',
      'strength-workout': 'Força'
    };

    // Primeiro, tentar encontrar o nome mapeado diretamente
    const directMatch = workoutNameMap[workoutId.toLowerCase()];
    if (directMatch) {
      console.log(`  -> Direct match found: "${directMatch}"`);
      return directMatch;
    }

    // Limpar e normalizar o nome
    let cleanName = workoutId.toLowerCase();
    
    // Remover prefixos "Workout_" e "Workout-" (case-insensitive)
    if (cleanName.startsWith('workout_')) {
      cleanName = cleanName.substring(8); // Remove "workout_"
      console.log(`  -> Removed "workout_" prefix: "${cleanName}"`);
    } else if (cleanName.startsWith('workout-')) {
      cleanName = cleanName.substring(8); // Remove "workout-"
      console.log(`  -> Removed "workout-" prefix: "${cleanName}"`);
    }

    // Remover sufixos comuns (order matters for proper cleanup)
    const suffixesToRemove = [
      '-workout-default', '_workout_default', '-workout-complete', '_workout_complete',
      '-workout-intense', '_workout_intense', '-workout-basic', '_workout_basic',
      '-workout', '_workout', '-default', '_default',
      '-advanced', '_advanced', '-intermediate', '_intermediate',
      '-beginner', '_beginner', '-complete', '_complete',
      '-intense', '_intense', '-basic', '_basic',
      '-wo', '_wo', '-wor', '_wor', '-w', '_w'
    ];
    
    suffixesToRemove.forEach(suffix => {
      if (cleanName.endsWith(suffix)) {
        cleanName = cleanName.slice(0, -suffix.length);
        console.log(`  -> Removed suffix "${suffix}": "${cleanName}"`);
      }
    });

    console.log(`  -> After suffix removal: "${cleanName}"`);

    // Try again with the cleaned name
    const cleanMatch = workoutNameMap[cleanName];
    if (cleanMatch) {
      console.log(`  -> Clean match found: "${cleanMatch}"`);
      return cleanMatch;
    }

    // Apply intelligent mapping based on keywords
    const keywordMap: { [key: string]: string } = {
      'chest': 'Peito',
      'peito': 'Peito',
      'legs': 'Pernas',
      'pernas': 'Pernas',
      'leg': 'Pernas',
      'perna': 'Pernas',
      'back': 'Costas',
      'costas': 'Costas',
      'bicep': 'Bíceps',
      'biceps': 'Bíceps',
      'shoulders': 'Ombros',
      'shoulder': 'Ombros',
      'ombros': 'Ombros',
      'ombro': 'Ombros',
      'tricep': 'Tríceps',
      'triceps': 'Tríceps',
      'core': 'Core',
      'cardio': 'Cardio',
      'full': 'Corpo Inteiro',
      'body': 'Corpo Inteiro',
      'strength': 'Força',
      'força': 'Força'
    };

    // Check if any keyword matches
    for (const [keyword, mappedName] of Object.entries(keywordMap)) {
      if (cleanName.includes(keyword)) {
        console.log(`  -> Keyword match "${keyword}" -> "${mappedName}"`);
        return mappedName;
      }
    }

    // Final cleanup: remove special characters and capitalize
    cleanName = cleanName
      .replace(/[-_]/g, ' ')
      .trim();

    console.log(`  -> After character replacement: "${cleanName}"`);

    // If empty or too short, return default
    if (cleanName.length === 0) {
      console.log(`  -> Empty name, returning "Treino"`);
      return 'Treino';
    }

    // Capitalize first letter of each word
    const finalName = cleanName
      .split(' ')
      .filter(word => word.length > 0) // Remove empty words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    console.log(`  -> Final result: "${finalName}"`);
    return finalName;
  }

  private getProgressChartData() {
    console.log('Getting progress chart data for:', this.selectedMetric, 'period:', this.selectedPeriod);
    
    const labels: string[] = [];
    const data: number[] = [];

    // Filtrar dados baseado no período selecionado
    const filteredData = this.getFilteredProgressData();
    console.log('Filtered progress data:', filteredData.length, 'points');

    filteredData.forEach(progress => {
      // Formatar label baseado no período
      let label: string;
      if (this.selectedPeriod === 'year') {
        label = new Date(progress.date).toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit'
        });
      } else if (this.selectedPeriod === 'month') {
        label = new Date(progress.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });
      } else { // week
        label = new Date(progress.date).toLocaleDateString('pt-BR', {
          weekday: 'short'
        });
      }
      
      labels.push(label);

      // Selecionar dados baseado na métrica
      switch (this.selectedMetric) {
        case 'frequency':
          data.push(progress.workoutsCompleted);
          break;
        case 'duration':
          data.push(progress.totalDuration);
          break;
        case 'calories':
          data.push(progress.totalCalories);
          break;
      }
    });

    console.log('Progress chart data generated:', { 
      labels: labels.length, 
      data: data.length, 
      metric: this.selectedMetric,
      period: this.selectedPeriod,
      sampleData: data.slice(0, 5)
    });

    // Se não há dados, retornar dados mock
    if (labels.length === 0) {
      console.log('No progress chart data found, generating mock data');
      return this.generateMockChartData();
    }

    return { labels, data };
  }

  private getFilteredProgressData(): ProgressDataPoint[] {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (this.selectedPeriod) {
      case 'week':
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case 'month':
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
      case 'year':
        cutoffDate = new Date(now);
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      default:
        cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    return this.progressData
      .filter(point => new Date(point.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private generateMockChartData() {
    console.log('Generating mock chart data for period:', this.selectedPeriod, 'metric:', this.selectedMetric);
    
    const mockLabels: string[] = [];
    const mockData: number[] = [];
    let dataPoints: number;
    
    switch (this.selectedPeriod) {
      case 'week':
        dataPoints = 7;
        break;
      case 'month':
        dataPoints = 30;
        break;
      case 'year':
        dataPoints = 12; // 12 meses
        break;
      default:
        dataPoints = 7;
    }
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date();
      
      // Ajustar data baseado no período
      if (this.selectedPeriod === 'year') {
        date.setMonth(date.getMonth() - i);
        mockLabels.push(date.toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit'
        }));
      } else if (this.selectedPeriod === 'month') {
        date.setDate(date.getDate() - i);
        mockLabels.push(date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        }));
      } else { // week
        date.setDate(date.getDate() - i);
        mockLabels.push(date.toLocaleDateString('pt-BR', {
          weekday: 'short'
        }));
      }
      
      // Gerar dados baseado na métrica e período
      let value: number;
      switch (this.selectedMetric) {
        case 'frequency':
          if (this.selectedPeriod === 'year') {
            value = Math.floor(Math.random() * 20) + 5; // 5-25 treinos por mês
          } else if (this.selectedPeriod === 'month') {
            value = Math.floor(Math.random() * 3); // 0-2 treinos por dia
          } else { // week
            value = Math.floor(Math.random() * 3); // 0-2 treinos por dia
          }
          break;
        case 'duration':
          if (this.selectedPeriod === 'year') {
            value = Math.floor(Math.random() * 600) + 300; // 300-900 min por mês
          } else if (this.selectedPeriod === 'month') {
            value = Math.floor(Math.random() * 120) + 30; // 30-150 min por dia
          } else { // week
            value = Math.floor(Math.random() * 120) + 30; // 30-150 min por dia
          }
          break;
        case 'calories':
          if (this.selectedPeriod === 'year') {
            value = Math.floor(Math.random() * 3000) + 1500; // 1500-4500 cal por mês
          } else if (this.selectedPeriod === 'month') {
            value = Math.floor(Math.random() * 500) + 200; // 200-700 cal por dia
          } else { // week
            value = Math.floor(Math.random() * 500) + 200; // 200-700 cal por dia
          }
          break;
        default:
          value = Math.floor(Math.random() * 10);
      }
      
      mockData.push(value);
    }
    
    console.log('Generated mock chart data:', { 
      labels: mockLabels.length, 
      data: mockData.length,
      sampleLabels: mockLabels.slice(0, 3),
      sampleData: mockData.slice(0, 3)
    });
    
    return { labels: mockLabels, data: mockData };
  }

  getMetricLabel(): string {
    this.updateCache();
    return this._cachedMetricLabel;
  }

  // Métodos otimizados para template com cache
  getStreakText(): string {
    this.updateCache();
    return this._cachedStreakText;
  }

  getLastWorkoutText(): string {
    this.updateCache();
    return this._cachedLastWorkoutText;
  }

  getAchievements() {
    this.updateCache();
    return this._cachedAchievements;
  }

  // Sistema de cache para evitar recálculos desnecessários
  private updateCache(): void {
    const currentData = JSON.stringify({
      stats: this.stats,
      sessionsLength: this.recentSessions.length,
      selectedMetric: this.selectedMetric,
      firstSessionTime: this.recentSessions[0]?.startTime
    });

    if (currentData !== this._lastCacheUpdateData) {
      this._cachedStreakText = this.calculateStreakText();
      this._cachedLastWorkoutText = this.calculateLastWorkoutText();
      this._cachedMetricLabel = this.calculateMetricLabel();
      this._cachedAchievements = this.calculateAchievements();
      this._lastCacheUpdateData = currentData;
    }
  }

  // Métodos de cálculo privados (não chamados no template)
  private calculateStreakText(): string {
    if (!this.stats) return '0 dias';

    const streak = this.stats.currentStreak || 0;
    if (streak === 0) return 'Sem sequência';
    if (streak === 1) return '1 dia';
    return `${streak} dias`;
  }

  private calculateLastWorkoutText(): string {
    if (!this.recentSessions.length) return 'Nenhum treino realizado';

    const lastSession = this.recentSessions[0];
    const daysDiff = Math.floor((Date.now() - new Date(lastSession.startTime).getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Hoje';
    if (daysDiff === 1) return 'Ontem';
    return `${daysDiff} dias atrás`;
  }

  private calculateMetricLabel(): string {
    switch (this.selectedMetric) {
      case 'frequency': return 'Treinos Realizados';
      case 'duration': return 'Duração (min)';
      case 'calories': return 'Calorias Queimadas';
      default: return '';
    }
  }

  private calculateAchievements(): any[] {
    if (!this.stats) return [];

    const achievements = [];

    if (this.stats.totalWorkouts >= 10) {
      achievements.push({
        icon: 'trophy',
        title: 'Dedicado',
        description: '10+ treinos realizados',
        color: 'warning'
      });
    }

    if ((this.stats.currentStreak || 0) >= 7) {
      achievements.push({
        icon: 'flame',
        title: 'Em Chamas',
        description: '7+ dias consecutivos',
        color: 'danger'
      });
    }

    if (this.stats.totalCalories >= 1000) {
      achievements.push({
        icon: 'fitness',
        title: 'Queimador',
        description: '1000+ calorias queimadas',
        color: 'success'
      });
    }

    return achievements;
  }

  // Métodos utilitários simples (sem cache necessário)
  getProgressPercentage(current: number, target: number): number {
    return Math.min((current / target) * 100, 100);
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}
