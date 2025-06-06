import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { WorkoutManagementService } from '../services/workout-management.service';
import { ProgressDataService } from '../services/progress-data.service';
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

  // Cache para evitar recálculos desnecessários e loops infinitos
  private _cachedStreakText: string = '0 dias';
  private _cachedLastWorkoutText: string = 'Nenhum treino realizado';
  private _cachedMetricLabel: string = 'Treinos Realizados';
  private _cachedAchievements: any[] = [];
  private _lastCacheUpdateData: string = '';
  private _isUpdatingCharts: boolean = false;

  constructor(
    private workoutService: WorkoutManagementService,
    private progressDataService: ProgressDataService
  ) { }

  async ngOnInit() {
    await this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroyCharts();
  }

  async ionViewDidEnter() {
    if (!this.isLoading && this.stats) {
      setTimeout(() => {
        this.createCharts();
      }, 100);
    }
  }

  ionViewWillLeave() {
    this.destroyCharts();
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
      console.log('LoadData: Starting to load data...');
      
      // Inicializar o ProgressDataService apenas uma vez
      await this.progressDataService.init();
      
      // Carregar dados do ProgressDataService usando subscriptions gerenciadas
      await this.loadDataFromProgressService();
      
      // Se não há dados, tentar carregar do WorkoutManagementService como fallback
      if (this.recentSessions.length === 0) {
        console.log('LoadData: No data from ProgressDataService, trying WorkoutManagementService...');
        await this.loadDataFromWorkoutService();
      } else {
        console.log('LoadData: Loaded', this.recentSessions.length, 'sessions from ProgressDataService');
      }

      // Se ainda não há dados, adicionar dados mockados SEMPRE para demonstração
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
      setTimeout(() => {
        if (this.stats) {
          this.createCharts();
        }
      }, 100);

    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
      // Em caso de erro, adicionar dados mockados para que a página funcione
      console.log('LoadData: Error occurred, adding mock data as fallback...');
      this.addMockData();
      this.updateCache();
      this.isLoading = false;
      
      setTimeout(() => {
        this.createCharts();
      }, 100);
    }
  }

  // Novo método para carregar dados do ProgressDataService
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
      
      this.recentSessions.push({
        id: `mock-session-${i}`,
        workoutId: `mock-workout-${i % 5}`, // 5 tipos diferentes de treino
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
      setTimeout(() => this.createCharts(), 200);
      return;
    }

    console.log('CreateCharts: All canvas elements available, proceeding...');

    // Set updating flag
    this._isUpdatingCharts = true;

    // Destroy any existing charts first
    this.destroyCharts();

    // Wait for destruction to complete before creating new charts
    setTimeout(() => {
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
    console.log('DistributionChart: Using data:', workoutTypes);

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
    setTimeout(() => {
      this.createCharts();
    }, 100);
  }

  private updateChartsWithCache() {
    // Método otimizado que usa cache e evita loops
    if (this._isUpdatingCharts) return;
    
    this.destroyCharts();
    setTimeout(() => {
      if (this.stats && !this._isUpdatingCharts) {
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

    this.recentSessions.forEach(session => {
      // Use the workoutId property from the simple WorkoutSession interface
      const workoutType = session.workoutId.substring(0, 8);
      distribution[workoutType] = (distribution[workoutType] || 0) + 1;
    });

    console.log('Workout type distribution:', distribution);

    // Se não há dados reais, retornar dados mock
    if (Object.keys(distribution).length === 0) {
      console.log('No workout distribution data found, returning mock data');
      return {
        labels: ['Peito', 'Costas', 'Pernas', 'Braços', 'Core'],
        data: [4, 3, 5, 2, 1]
      };
    }

    return {
      labels: Object.keys(distribution),
      data: Object.values(distribution)
    };
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
