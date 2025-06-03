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

  async loadData() {
    try {
      this.isLoading = true;
      
      // Inicializar o ProgressDataService apenas uma vez
      await this.progressDataService.init();
      
      // Carregar dados do ProgressDataService usando subscriptions gerenciadas
      await this.loadDataFromProgressService();
      
      // Se não há dados, tentar carregar do WorkoutManagementService como fallback
      if (this.recentSessions.length === 0) {
        await this.loadDataFromWorkoutService();
      }

      // Atualizar cache após carregar dados
      this.updateCache();

      this.isLoading = false;
      
      // Criar gráficos após carregar dados
      setTimeout(() => {
        if (this.stats) {
          this.createCharts();
        }
      }, 100);

    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
      this.isLoading = false;
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

  async onPeriodChange() {
    // Evitar loops infinitos durante atualização
    if (this._isUpdatingCharts) return;
    
    this._isUpdatingCharts = true;
    try {
      await this.loadData();
      this.updateChartsWithCache();
    } finally {
      this._isUpdatingCharts = false;
    }
  }

  async onMetricChange() {
    // Evitar loops infinitos durante atualização
    if (this._isUpdatingCharts) return;
    
    this._isUpdatingCharts = true;
    try {
      this.updateCache(); // Atualizar cache do label da métrica
      this.updateChartsWithCache();
    } finally {
      this._isUpdatingCharts = false;
    }
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
    this.createWeeklyChart();
    this.createWorkoutDistributionChart();
    this.createProgressChart();
  }

  private createWeeklyChart() {
    if (!this.weeklyChartRef || !this.stats) return;

    const ctx = this.weeklyChartRef.nativeElement.getContext('2d');

    const data = this.getWeeklyData();

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
    if (!this.workoutDistributionRef || !this.stats) return;

    const ctx = this.workoutDistributionRef.nativeElement.getContext('2d');

    const workoutTypes = this.getWorkoutTypeDistribution();

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
    if (!this.progressChartRef || !this.progressData.length) return;

    const ctx = this.progressChartRef.nativeElement.getContext('2d');

    const chartData = this.getProgressChartData();

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
    this.destroyCharts();
    setTimeout(() => {
      if (this.stats && !this._isUpdatingCharts) {
        this.createCharts();
      }
    }, 100);
  }

  private destroyCharts() {
    if (this.weeklyChart) {
      this.weeklyChart.destroy();
      this.weeklyChart = null;
    }
    if (this.workoutDistributionChart) {
      this.workoutDistributionChart.destroy();
      this.workoutDistributionChart = null;
    }
    if (this.progressChart) {
      this.progressChart.destroy();
      this.progressChart = null;
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

    return weekData;
  }

  private getWorkoutTypeDistribution() {
    const distribution: { [key: string]: number } = {};

    this.recentSessions.forEach(session => {
      // Use the workoutId property from the simple WorkoutSession interface
      const workoutType = session.workoutId.substring(0, 8);
      distribution[workoutType] = (distribution[workoutType] || 0) + 1;
    });

    return {
      labels: Object.keys(distribution),
      data: Object.values(distribution)
    };
  }

  private getProgressChartData() {
    const labels: string[] = [];
    const data: number[] = [];

    this.progressData.forEach(progress => {
      labels.push(new Date(progress.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      }));

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

    return { labels, data };
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
