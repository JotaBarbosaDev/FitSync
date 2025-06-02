import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { WorkoutManagementService } from '../services/workout-management.service';
import { WorkoutProgress, WorkoutStats, WorkoutSession } from '../models/workout-system.model';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-workout-progress',
  templateUrl: './workout-progress.page.html',
  styleUrls: ['./workout-progress.page.scss'],
})
export class WorkoutProgressPage implements OnInit {
  @ViewChild('weeklyChart', { static: false }) weeklyChartRef!: ElementRef;
  @ViewChild('workoutDistributionChart', { static: false }) workoutDistributionRef!: ElementRef;
  @ViewChild('progressChart', { static: false }) progressChartRef!: ElementRef;

  weeklyChart: Chart | null = null;
  workoutDistributionChart: Chart | null = null;
  progressChart: Chart | null = null;

  stats: WorkoutStats | null = null;
  recentSessions: WorkoutSession[] = [];
  progressData: WorkoutProgress[] = [];
  
  selectedPeriod: 'week' | 'month' | 'year' = 'month';
  selectedMetric: 'frequency' | 'duration' | 'calories' = 'frequency';

  constructor(private workoutService: WorkoutManagementService) { }

  async ngOnInit() {
    await this.loadData();
  }

  async ionViewDidEnter() {
    await this.loadData();
    setTimeout(() => {
      this.createCharts();
    }, 100);
  }

  ionViewWillLeave() {
    this.destroyCharts();
  }

  async loadData() {
    try {
      this.stats = await this.workoutService.getWorkoutStats();
      this.recentSessions = await this.workoutService.getRecentSessions(10);
      this.progressData = await this.workoutService.getProgressData(this.selectedPeriod);
    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
    }
  }

  async onPeriodChange() {
    await this.loadData();
    this.updateCharts();
  }

  async onMetricChange() {
    this.updateCharts();
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
          backgroundColor: 'rgba(var(--ion-color-primary-rgb), 0.7)',
          borderColor: 'var(--ion-color-primary)',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
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
            'rgba(var(--ion-color-primary-rgb), 0.8)',
            'rgba(var(--ion-color-secondary-rgb), 0.8)',
            'rgba(var(--ion-color-tertiary-rgb), 0.8)',
            'rgba(var(--ion-color-success-rgb), 0.8)',
            'rgba(var(--ion-color-warning-rgb), 0.8)'
          ],
          borderWidth: 2,
          borderColor: 'var(--ion-color-light)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
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
          backgroundColor: 'rgba(var(--ion-color-primary-rgb), 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'var(--ion-color-primary)',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(var(--ion-color-medium-rgb), 0.2)'
            }
          }
        }
      }
    });
  }

  private updateCharts() {
    this.destroyCharts();
    setTimeout(() => {
      this.createCharts();
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
      // Simplificar: usar o ID do treino como tipo
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

  private getMetricLabel(): string {
    switch (this.selectedMetric) {
      case 'frequency': return 'Treinos Realizados';
      case 'duration': return 'Duração (min)';
      case 'calories': return 'Calorias Queimadas';
      default: return '';
    }
  }

  getProgressPercentage(current: number, target: number): number {
    return Math.min((current / target) * 100, 100);
  }

  getStreakText(): string {
    if (!this.stats) return '0 dias';
    
    const streak = this.stats.currentStreak;
    if (streak === 0) return 'Sem sequência';
    if (streak === 1) return '1 dia';
    return `${streak} dias`;
  }

  getLastWorkoutText(): string {
    if (!this.recentSessions.length) return 'Nenhum treino realizado';
    
    const lastSession = this.recentSessions[0];
    const daysDiff = Math.floor((Date.now() - new Date(lastSession.startTime).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Hoje';
    if (daysDiff === 1) return 'Ontem';
    return `${daysDiff} dias atrás`;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getAchievements() {
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
    
    if (this.stats.currentStreak >= 7) {
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
}
