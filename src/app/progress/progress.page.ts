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
  filteredProgress: ProgressData[] = [];
  selectedTimeRange: string = '30';
  selectedMuscleGroup: string = 'all';
  isLoading: boolean = true;

  private subscriptions: Subscription[] = [];

  // Chart configurations
  volumeChartConfig: ChartConfig = {
    type: 'area',
    color: '#3880ff',
    showPoints: true,
    showGrid: true,
    height: 200
  };

  strengthChartConfig: ChartConfig = {
    type: 'line',
    color: '#10dc60',
    showPoints: true,
    showGrid: true,
    height: 200
  };

  timeRangeOptions = [
    { value: '7', label: '7 dias' },
    { value: '30', label: '30 dias' },
    { value: '90', label: '3 meses' },
    { value: '365', label: '1 ano' }
  ];

  muscleGroupOptions = [
    { id: 'all', name: 'Todos', icon: 'fitness-outline' },
    { id: 'chest', name: 'Peito', icon: 'fitness-outline' },
    { id: 'back', name: 'Costas', icon: 'fitness-outline' },
    { id: 'shoulders', name: 'Ombros', icon: 'fitness-outline' },
    { id: 'legs', name: 'Pernas', icon: 'walk-outline' },
    { id: 'arms', name: 'Braços', icon: 'barbell-outline' },
    { id: 'core', name: 'Core', icon: 'body-outline' }
  ];

  constructor(
    public router: Router,
    private progressDataService: ProgressDataService
  ) { }

  ngOnInit() {
    this.subscribeToData();
    this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToData() {
    // Subscribe to workout sessions
    const sessionsSub = this.progressDataService.workoutSessions$.subscribe(sessions => {
      this.updateProgressData(sessions);
    });
    this.subscriptions.push(sessionsSub);

    // Subscribe to achievements
    const achievementsSub = this.progressDataService.achievements$.subscribe(achievements => {
      this.achievements = achievements;
    });
    this.subscriptions.push(achievementsSub);

    // Subscribe to progress stats
    const statsSub = this.progressDataService.progressStats$.subscribe(stats => {
      if (stats) {
        this.updatePerformanceMetrics(stats);
      }
    });
    this.subscriptions.push(statsSub);
  }
  private async loadData() {
    this.isLoading = true;
    await this.progressDataService.init();
    
    // Check if data exists by subscribing and checking length
    this.progressDataService.workoutSessions$.subscribe(sessions => {
      if (!sessions || sessions.length === 0) {
        this.generateSampleData();
      }
    });
    
    this.isLoading = false;
  }

  private async generateSampleData() {
    // Generate sample workout sessions
    const sampleExercises = [
      { id: 'supino', name: 'Supino Reto', muscleGroup: 'chest' },
      { id: 'agachamento', name: 'Agachamento', muscleGroup: 'legs' },
      { id: 'barra_fixa', name: 'Barra Fixa', muscleGroup: 'back' },
      { id: 'desenvolvimento', name: 'Desenvolvimento', muscleGroup: 'shoulders' }
    ];

    for (let i = 0; i < 20; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * 2);

      const sessionExercises = sampleExercises.slice(0, Math.floor(Math.random() * 3) + 2).map(exercise => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: [
          { reps: 8 + Math.floor(Math.random() * 4), weight: 60 + Math.floor(Math.random() * 40), rpe: 7 + Math.floor(Math.random() * 3) },
          { reps: 8 + Math.floor(Math.random() * 4), weight: 60 + Math.floor(Math.random() * 40), rpe: 7 + Math.floor(Math.random() * 3) },
          { reps: 8 + Math.floor(Math.random() * 4), weight: 60 + Math.floor(Math.random() * 40), rpe: 7 + Math.floor(Math.random() * 3) }
        ],
        totalVolume: 0,
        oneRepMax: 0
      }));

      // Calculate total volume for each exercise
      sessionExercises.forEach(exercise => {
        exercise.totalVolume = exercise.sets.reduce((sum, set) => sum + (set.reps * set.weight), 0);
      });

      const totalVolume = sessionExercises.reduce((sum, exercise) => sum + exercise.totalVolume, 0);
      const muscleGroups = [...new Set(sessionExercises.map(ex => ex.muscleGroup))];

      await this.progressDataService.addWorkoutSession({
        date: date.toISOString(),
        exercises: sessionExercises,
        duration: 45 + Math.floor(Math.random() * 30),
        totalVolume,
        muscleGroups,
        notes: i % 5 === 0 ? 'Ótimo treino!' : undefined
      });
    }
  }

  private updateProgressData(sessions: WorkoutSession[]) {
    const exerciseMap = new Map<string, ProgressData>();

    sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        if (!exerciseMap.has(exercise.exerciseId)) {
          exerciseMap.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            muscleGroup: exercise.muscleGroup,
            sessions: [],
            bestSet: { weight: 0, reps: 0, date: new Date() },
            totalVolume: 0,
            averageRPE: 0,
            progressTrend: 'stable',
            chartData: []
          });
        }

        const progressData = exerciseMap.get(exercise.exerciseId)!;
        progressData.sessions.push(session);
        progressData.totalVolume += exercise.totalVolume;

        // Update best set
        exercise.sets.forEach(set => {
          if (set.weight > progressData.bestSet.weight) {
            progressData.bestSet = {
              weight: set.weight,
              reps: set.reps,
              date: new Date(session.date)
            };
          }
        });

        // Calculate average RPE
        const allRPEs = exercise.sets.filter(set => set.rpe).map(set => set.rpe!);
        if (allRPEs.length > 0) {
          progressData.averageRPE = allRPEs.reduce((sum, rpe) => sum + rpe, 0) / allRPEs.length;
        }
      });
    });

    // Convert to array and generate chart data
    this.progressData = Array.from(exerciseMap.values()).map(data => {
      data.chartData = this.generateChartData(data);
      data.progressTrend = this.calculateTrend(data.chartData);
      return data;
    });

    this.applyFilters();
  }

  private generateChartData(progressData: ProgressData): ChartDataPoint[] {
    const days = parseInt(this.selectedTimeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const relevantSessions = progressData.sessions
      .filter(session => new Date(session.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return relevantSessions.map(session => {
      const exercise = session.exercises.find(ex => ex.exerciseId === progressData.exerciseId);
      const maxWeight = exercise ? Math.max(...exercise.sets.map(set => set.weight)) : 0;
      
      return {
        date: session.date,
        value: maxWeight,
        label: `${maxWeight}kg`
      };
    });
  }

  private calculateTrend(chartData: ChartDataPoint[]): 'increasing' | 'stable' | 'decreasing' {
    if (chartData.length < 2) return 'stable';

    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const difference = last - first;
    const percentage = (difference / first) * 100;

    if (percentage > 5) return 'increasing';
    if (percentage < -5) return 'decreasing';
    return 'stable';
  }

  private updatePerformanceMetrics(stats: ProgressStats) {
    this.performanceMetrics = {
      totalWorkouts: stats.totalWorkouts,
      totalVolume: stats.totalVolume,
      averageWorkoutDuration: stats.averageWorkoutDuration,
      favoriteExercises: [stats.favoriteExercise].filter(Boolean),
      strongestMuscleGroups: [stats.strongestExercise].filter(Boolean),
      consistencyScore: stats.consistencyScore,
      weeklyProgress: stats.currentStreak
    };
  }

  // Filter methods
  onTimeRangeChange(range: string) {
    this.selectedTimeRange = range;
    this.applyFilters();
  }

  onMuscleGroupChange(muscleGroup: string) {
    this.selectedMuscleGroup = muscleGroup;
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.progressData];

    // Filter by muscle group
    if (this.selectedMuscleGroup !== 'all') {
      filtered = filtered.filter(data => data.muscleGroup === this.selectedMuscleGroup);
    }

    // Update chart data based on time range
    filtered = filtered.map(data => ({
      ...data,
      chartData: this.generateChartData(data)
    }));

    this.filteredProgress = filtered;
  }

  // Navigation methods
  openExerciseDetail(exerciseId: string) {
    this.router.navigate(['/detalhe', exerciseId]);
  }

  openWorkoutHistory() {
    this.router.navigate(['/dashboard']);
  }

  openAchievements() {
    this.router.navigate(['/progress/achievements']);
  }

  // Utility methods
  getMuscleGroupName(groupId: string): string {
    const group = this.muscleGroupOptions.find(g => g.id === groupId);
    return group ? group.name : groupId;
  }

  getMuscleGroupIcon(groupId: string): string {
    const group = this.muscleGroupOptions.find(g => g.id === groupId);
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

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'consistency': return 'calendar';
      case 'strength': return 'barbell';
      case 'volume': return 'trending-up';
      case 'milestone': return 'trophy';
      default: return 'medal';
    }
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'consistency': return 'primary';
      case 'strength': return 'danger';
      case 'volume': return 'warning';
      case 'milestone': return 'success';
      default: return 'medium';
    }
  }

  // Chart data methods
  getVolumeChartData(): ChartDataPoint[] {
    const days = parseInt(this.selectedTimeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Group sessions by date and sum total volume
    const volumeByDate = new Map<string, number>();
    
    this.progressData.forEach(exercise => {
      exercise.sessions
        .filter(session => new Date(session.date) >= cutoffDate)
        .forEach(session => {
          const dateKey = session.date.split('T')[0]; // Get date part only
          const currentVolume = volumeByDate.get(dateKey) || 0;
          volumeByDate.set(dateKey, currentVolume + session.totalVolume);
        });
    });

    return Array.from(volumeByDate.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, volume]) => ({
        date,
        value: volume,
        label: `${(volume / 1000).toFixed(1)}k kg`
      }));
  }

  getStrengthChartData(): ChartDataPoint[] {
    const days = parseInt(this.selectedTimeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get the strongest exercise progress over time
    const strongestExercise = this.progressData.reduce((strongest, current) => 
      current.bestSet.weight > strongest.bestSet.weight ? current : strongest
    );

    if (!strongestExercise) return [];

    return strongestExercise.sessions
      .filter(session => new Date(session.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(session => {
        const exercise = session.exercises.find(ex => ex.exerciseId === strongestExercise.exerciseId);
        const maxWeight = exercise ? Math.max(...exercise.sets.map(set => set.weight)) : 0;
        
        return {
          date: session.date,
          value: maxWeight,
          label: `${maxWeight} kg`
        };
      });
  }
}
