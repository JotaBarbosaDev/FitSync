import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProgressDataService, WorkoutSession, Achievement, ProgressStats } from '../services/progress-data.service';
import { ChartDataPoint, ChartConfig } from '../shared/progress-chart/progress-chart.component';

interface ProgressData {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sessions: WorkoutSession[];
  bestSet: { weight: number; reps: number; date: Date };
  totalVolume: number;
  averageRPE: number;
  progressTrend: 'increasing' | 'stable' | 'decreasing';
  chartData: ChartDataPoint[];
}

interface PerformanceMetrics {
  totalWorkouts: number;
  totalVolume: number;
  averageWorkoutDuration: number;
  favoriteExercises: string[];
  strongestMuscleGroups: string[];
  consistencyScore: number;
  weeklyProgress: number;
}

@Component({
  selector: 'app-progress',
  templateUrl: './progress.page.html',
  styleUrls: ['./progress.page.scss'],
  standalone: false,
})
export class ProgressPage implements OnInit, OnDestroy {
  progressData: ProgressData[] = [];
  performanceMetrics: PerformanceMetrics | null = null;
  achievements: Achievement[] = [];
  selectedTimeRange: 'week' | 'month' | 'quarter' | 'year' = 'month';
  selectedMuscleGroup: string = 'all';
  isLoading: boolean = true;
  
  private subscriptions: Subscription[] = [];

  muscleGroups = [
    { id: 'all', name: 'Todos', icon: 'fitness-outline' },
    { id: 'chest', name: 'Peito', icon: 'body-outline' },
    { id: 'back', name: 'Costas', icon: 'body-outline' },
    { id: 'legs', name: 'Pernas', icon: 'walk-outline' },
    { id: 'shoulders', name: 'Ombros', icon: 'body-outline' },
    { id: 'arms', name: 'Braços', icon: 'barbell-outline' },
    { id: 'core', name: 'Core', icon: 'body-outline' }
  ];

  constructor(public router: Router) { }

  ngOnInit() {
    this.loadProgressData();
    this.loadPerformanceMetrics();
    this.loadAchievements();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadProgressData() {
    // Simulate loading progress data
    setTimeout(() => {
      this.progressData = [
        {
          exerciseId: '1',
          exerciseName: 'Supino Reto',
          muscleGroup: 'chest',
          sessions: this.generateMockSessions(),
          bestSet: { weight: 80, reps: 8, date: new Date() },
          totalVolume: 12500,
          averageRPE: 7.5,
          progressTrend: 'increasing'
        },
        {
          exerciseId: '2',
          exerciseName: 'Agachamento',
          muscleGroup: 'legs',
          sessions: this.generateMockSessions(),
          bestSet: { weight: 100, reps: 10, date: new Date() },
          totalVolume: 18000,
          averageRPE: 8.2,
          progressTrend: 'increasing'
        },
        {
          exerciseId: '3',
          exerciseName: 'Barra Fixa',
          muscleGroup: 'back',
          sessions: this.generateMockSessions(),
          bestSet: { weight: 0, reps: 12, date: new Date() },
          totalVolume: 3600,
          averageRPE: 8.8,
          progressTrend: 'stable'
        }
      ];
      this.isLoading = false;
    }, 1000);
  }

  private loadPerformanceMetrics() {
    setTimeout(() => {
      this.performanceMetrics = {
        totalWorkouts: 47,
        totalVolume: 34100,
        averageWorkoutDuration: 65,
        favoriteExercises: ['Supino Reto', 'Agachamento', 'Desenvolvimento'],
        strongestMuscleGroups: ['Pernas', 'Peito', 'Ombros'],
        consistencyScore: 85,
        weeklyProgress: 12
      };
    }, 800);
  }

  private loadAchievements() {
    setTimeout(() => {
      this.achievements = [
        {
          id: '1',
          title: 'Primeira Semana',
          description: 'Complete 7 dias consecutivos de treino',
          icon: 'ribbon-outline',
          dateEarned: new Date(2025, 4, 15),
          category: 'consistency'
        },
        {
          id: '2',
          title: 'Força de Aço',
          description: 'Levante mais de 100kg no agachamento',
          icon: 'barbell-outline',
          dateEarned: new Date(2025, 4, 20),
          category: 'strength'
        },
        {
          id: '3',
          title: 'Volume Master',
          description: 'Complete 30.000kg de volume total',
          icon: 'trending-up-outline',
          dateEarned: new Date(2025, 4, 25),
          category: 'volume'
        }
      ];
    }, 1200);
  }

  private generateMockSessions(): WorkoutSession[] {
    const sessions: WorkoutSession[] = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() - (i * 3));
      
      sessions.push({
        date: sessionDate,
        sets: [
          { reps: 10, weight: 70 + i, rpe: 7 },
          { reps: 8, weight: 75 + i, rpe: 8 },
          { reps: 6, weight: 80 + i, rpe: 9 }
        ],
        totalVolume: (70 + i) * 10 + (75 + i) * 8 + (80 + i) * 6,
        duration: 45 + Math.random() * 20
      });
    }
    
    return sessions.reverse();
  }

  // Filter methods
  onTimeRangeChange(range: 'week' | 'month' | 'quarter' | 'year') {
    this.selectedTimeRange = range;
    this.filterProgressData();
  }

  onMuscleGroupChange(muscleGroup: string) {
    this.selectedMuscleGroup = muscleGroup;
    this.filterProgressData();
  }

  private filterProgressData() {
    // Filter logic based on time range and muscle group
    this.isLoading = true;
    setTimeout(() => {
      // Simulate filtering
      this.isLoading = false;
    }, 500);
  }

  // Navigation methods
  openExerciseDetail(exerciseId: string) {
    this.router.navigate(['/progress/exercise', exerciseId]);
  }

  openWorkoutHistory() {
    this.router.navigate(['/history']);
  }

  openAchievements() {
    this.router.navigate(['/achievements']);
  }

  // Utility methods
  getMuscleGroupName(groupId: string): string {
    const group = this.muscleGroups.find(g => g.id === groupId);
    return group ? group.name : groupId;
  }

  getMuscleGroupIcon(groupId: string): string {
    const group = this.muscleGroups.find(g => g.id === groupId);
    return group ? group.icon : 'fitness-outline';
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'increasing': return 'trending-up';
      case 'decreasing': return 'trending-down';
      default: return 'remove';
    }
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'increasing': return 'success';
      case 'decreasing': return 'danger';
      default: return 'warning';
    }
  }

  formatVolume(volume: number): string {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toString();
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }

  getConsistencyColor(): string {
    if (!this.performanceMetrics) return 'medium';
    
    if (this.performanceMetrics.consistencyScore >= 80) return 'success';
    if (this.performanceMetrics.consistencyScore >= 60) return 'warning';
    return 'danger';
  }

  getProgressDescription(): string {
    if (!this.performanceMetrics) return '';
    
    const progress = this.performanceMetrics.weeklyProgress;
    if (progress > 10) return 'Excelente progresso!';
    if (progress > 5) return 'Bom progresso';
    if (progress > 0) return 'Progresso moderado';
    return 'Mantenha o foco';
  }
}
