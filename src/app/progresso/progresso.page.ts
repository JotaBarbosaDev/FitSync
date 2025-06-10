import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActionSheetController, AlertController, ToastController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonDataService } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';
import { DeviceControlService } from '../services/device-control.service';

interface UserProgressDay {
  exercises?: Array<{
    name: string;
    sets: number;
    reps: number;
    weight: number;
  }>;
  calories?: number;
  totalVolume?: number;
  duration?: number;
}

interface UserProgress {
  [date: string]: UserProgressDay;
}

interface ExerciseRecord {
  id?: string;
  exerciseId: string;
  exerciseName?: string;
  exercise?: string;
  name: string;
  personalRecord: number;
  oneRepMax?: number;
  weight?: number;
  date: string;
  calories?: number;
  sets?: Array<{
    reps: number;
    weight: number;
    completed: boolean;
  }>;
  muscleGroup?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  current: number;
  target: number;
  unlockedDate?: Date;
}

interface WorkoutHistory {
  id: string;
  name: string;
  date: Date;
  duration: number;
  exercises: number;
  calories: number;
  sets: number;
  muscleGroups: string[];
}

interface PersonalRecord {
  id: string;
  exercise: string;
  value: number;
  unit: string;
  date: Date;
  icon: string;
  improvement?: number;
}

interface MuscleGroupStat {
  name: string;
  icon: string;
  color: string;
  percentage: number;
  workouts: number;
}

interface AlertData {
  weight?: number;
  goal?: string;
  target?: number;
  [key: string]: string | number | boolean | undefined;
}

@Component({
  selector: 'app-progresso',
  templateUrl: './progresso.page.html',
  styleUrls: ['./progresso.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ProgressoPage implements OnInit, AfterViewInit {
  @ViewChild('weightChartRef', { static: false }) weightChartRef!: ElementRef;
  @ViewChild('workoutChartRef', { static: false }) workoutChartRef!: ElementRef;

  loading: boolean = true;
  selectedPeriod: string = 'month';
  selectedMuscleGroup: string = 'all';
  viewMode: 'charts' | 'list' = 'charts';

  // Stats
  totalWorkouts: number = 0;
  totalCalories: number = 0;
  totalVolume: number = 0;
  totalMinutes: number = 0;
  currentStreak: number = 0;
  weeklyGoal: number = 4;
  weeklyProgress: number = 0;
  weeklyChange: number = 0;
  calorieChange: number = 0;
  timeChange: number = 0;
  streakChange: number = 0;

  achievements: Achievement[] = [];
  recentAchievements: Achievement[] = [];
  workoutHistory: WorkoutHistory[] = [];
  personalRecords: PersonalRecord[] = [];
  muscleGroupStats: MuscleGroupStat[] = [];

  // Chart data
  weightData: number[] = [];
  workoutData: number[] = [];
  labels: string[] = [];

  constructor(
    private actionSheetController: ActionSheetController,
    private alertController: AlertController,
    private toastController: ToastController,
    private jsonDataService: JsonDataService,
    private navigationService: NavigationService,
    private storageService: StorageService,
    private deviceControlService: DeviceControlService
  ) { }

  async ngOnInit() {
    await this.deviceControlService.lockToPortrait();
    this.loadProgressData();
    await this.loadAchievements();
    await this.loadWorkoutHistory();
    await this.loadPersonalRecords();
    this.calculateStats();
    this.loading = false;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.createWeightChart();
      this.createWorkoutChart();
    }, 100);
  }

  async onRefresh(event: CustomEvent) {
    try {
      await this.loadProgressData();
    } catch (error) {
      console.error('Erro ao atualizar dados de progresso:', error);
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  async loadProgressData() {
    try {
      const progress = await this.storageService.get('userProgress') || {};
      
      // Calculate totals from stored progress
      Object.values(progress).forEach((day: UserProgressDay) => {
        this.totalWorkouts += day.exercises?.length || 0;
        this.totalCalories += day.calories || 0;
        this.totalVolume += day.totalVolume || 0;
      });

      // Calculate current streak
      this.currentStreak = this.calculateCurrentStreak(progress as UserProgress);
      
      // Calculate weekly progress
      this.weeklyProgress = this.calculateWeeklyProgress(progress as UserProgress);

    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  }

  async loadAchievements() {
    try {
      const storedAchievements = await this.storageService.get('achievements') || [];
      
      // Default achievements
      this.achievements = [
        {
          id: '1',
          title: 'Primeiro Treino',
          description: 'Complete seu primeiro treino',
          icon: 'trophy-outline',
          unlocked: this.totalWorkouts > 0,
          progress: Math.min(this.totalWorkouts, 1),
          current: this.totalWorkouts,
          target: 1
        },
        {
          id: '2',
          title: 'Consistência',
          description: 'Complete 10 treinos',
          icon: 'medal-outline',
          unlocked: this.totalWorkouts >= 10,
          progress: Math.min(this.totalWorkouts / 10, 1),
          current: this.totalWorkouts,
          target: 10
        },
        {
          id: '3',
          title: 'Queimador de Calorias',
          description: 'Queime 1000 calorias',
          icon: 'flame-outline',
          unlocked: this.totalCalories >= 1000,
          progress: Math.min(this.totalCalories / 1000, 1),
          current: this.totalCalories,
          target: 1000
        },
        {
          id: '4',
          title: 'Sequência de Ferro',
          description: 'Mantenha uma sequência de 7 dias',
          icon: 'ribbon-outline',
          unlocked: this.currentStreak >= 7,
          progress: Math.min(this.currentStreak / 7, 1),
          current: this.currentStreak,
          target: 7
        }
      ];

      // Set recent achievements (copy of achievements)
      this.recentAchievements = [...this.achievements];

      // Merge with stored achievements
      (storedAchievements as Achievement[]).forEach((stored: Achievement) => {
        const index = this.achievements.findIndex(a => a.id === stored.id);
        if (index !== -1) {
          this.achievements[index] = { ...this.achievements[index], ...stored };
          this.recentAchievements[index] = { ...this.recentAchievements[index], ...stored };
        }
      });

    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  }

  async loadWorkoutHistory() {
    try {
      const history = await this.storageService.get('exerciseHistory') || [];
      
      // Group exercises by date to create workout sessions
      const workoutsByDate = new Map();
      
      (history as ExerciseRecord[]).forEach((exercise: ExerciseRecord) => {
        const dateKey = new Date(exercise.date).toDateString();
        if (!workoutsByDate.has(dateKey)) {
          workoutsByDate.set(dateKey, []);
        }
        workoutsByDate.get(dateKey).push(exercise);
      });

      // Convert to workout history format
      this.workoutHistory = Array.from(workoutsByDate.entries()).map(([dateKey, exercises]: [string, ExerciseRecord[]]) => {
        const date = new Date(dateKey);
        const totalCalories = exercises.reduce((sum, ex) => sum + (ex.calories || 0), 0);
        const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
        
        return {
          id: dateKey,
          name: `Treino do dia ${date.toLocaleDateString()}`,
          date,
          duration: exercises.length * 15, // Estimate 15min per exercise
          exercises: exercises.length,
          calories: totalCalories,
          sets: totalSets,
          muscleGroups: [...new Set(exercises.map(ex => ex.muscleGroup || 'Geral'))]
        };
      }).sort((a, b) => b.date.getTime() - a.date.getTime());

    } catch (error) {
      console.error('Error loading workout history:', error);
    }
  }

  async loadPersonalRecords() {
    try {
      const records = await this.storageService.get('personalRecords') || [];
      
      // Group by exercise and get best records
      const bestRecords = new Map();
      
      (records as ExerciseRecord[]).forEach((record: ExerciseRecord) => {
        const key = record.exerciseName || record.exercise;
        if (!bestRecords.has(key) || (record.oneRepMax && record.oneRepMax > bestRecords.get(key).value)) {
          bestRecords.set(key, {
            id: record.id,
            exercise: key,
            value: record.oneRepMax || record.weight || 0,
            unit: 'kg',
            date: new Date(record.date),
            icon: 'barbell-outline'
          });
        }
      });

      this.personalRecords = Array.from(bestRecords.values())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5); // Show top 5 records

    } catch (error) {
      console.error('Error loading personal records:', error);
    }
  }

  calculateStats() {
    // Calculate muscle group stats based on workout history
    const muscleGroupCounts = new Map();
    
    this.workoutHistory.forEach(workout => {
      workout.muscleGroups.forEach(group => {
        muscleGroupCounts.set(group, (muscleGroupCounts.get(group) || 0) + 1);
      });
    });

    const totalWorkouts = this.workoutHistory.length;
    
    this.muscleGroupStats = [
      { name: 'Peito', icon: 'body-outline', color: 'danger', percentage: 0, workouts: 0 },
      { name: 'Costas', icon: 'person-outline', color: 'success', percentage: 0, workouts: 0 },
      { name: 'Pernas', icon: 'walk-outline', color: 'warning', percentage: 0, workouts: 0 },
      { name: 'Braços', icon: 'barbell-outline', color: 'secondary', percentage: 0, workouts: 0 },
      { name: 'Ombros', icon: 'arrow-up-outline', color: 'tertiary', percentage: 0, workouts: 0 }
    ];

    this.muscleGroupStats.forEach(stat => {
      const count = muscleGroupCounts.get(stat.name) || 0;
      stat.workouts = count;
      stat.percentage = totalWorkouts > 0 ? Math.round((count / totalWorkouts) * 100) : 0;
    });
  }

  calculateCurrentStreak(progress: UserProgress): number {
    const dates = Object.keys(progress).sort().reverse();
    let streak = 0;
    
    for (const date of dates) {
      if (progress[date]?.exercises?.length && progress[date].exercises!.length > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  calculateWeeklyProgress(progress: UserProgress): number {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    
    let weeklyWorkouts = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateKey = date.toDateString();
      
      if (progress[dateKey]?.exercises?.length && progress[dateKey].exercises!.length > 0) {
        weeklyWorkouts++;
      }
    }
    
    return Math.min(weeklyWorkouts / this.weeklyGoal, 1);
  }

  createWeightChart() {
    if (!this.weightChartRef) return;

    const ctx = this.weightChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Mock weight progression data
    const weightData = [70, 69.5, 69.8, 69.2, 68.9, 68.5, 68.3, 68.0];
    const labels = ['8 sem', '7 sem', '6 sem', '5 sem', '4 sem', '3 sem', '2 sem', '1 sem'];

    this.drawLineChart(ctx, labels, weightData, '#10dc60');
  }

  createWorkoutChart() {
    if (!this.workoutChartRef) return;

    const ctx = this.workoutChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Mock workout frequency data
    const workoutData = [3, 4, 5, 4, 6, 5, 4, 5];
    const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

    this.drawBarChart(ctx, labels, workoutData);
  }

  drawLineChart(ctx: CanvasRenderingContext2D, labels: string[], data: number[], color: string) {
    const canvas = ctx.canvas;
    const padding = 20;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillStyle = color;

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = padding + (i * chartWidth) / (data.length - 1);
      const y = padding + chartHeight - ((data[i] - minValue) / range) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Draw points
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
    }
    ctx.stroke();
  }

  drawBarChart(ctx: CanvasRenderingContext2D, labels: string[], data: number[]) {
    const canvas = ctx.canvas;
    const padding = 20;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3880ff';

    const maxValue = Math.max(...data);
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;

    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / maxValue) * chartHeight;
      const x = padding + i * (barWidth + barSpacing) + barSpacing / 2;
      const y = padding + chartHeight - barHeight;
      
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  async presentAchievementDetails(achievement: Achievement) {
    const alert = await this.alertController.create({
      header: achievement.title,
      message: `${achievement.description}<br><br>Progresso: ${achievement.current}/${achievement.target}`,
      buttons: ['OK']
    });
    await alert.present();
  }

  async openWorkoutHistory() {
    this.navigationService.navigateToWorkouts();
  }

  async openExerciseDetail(exerciseId: string) {
    this.navigationService.navigateToExerciseDetail(exerciseId);
  }

  getMuscleGroupColor(muscleGroup: string): string {
    const colorMap: { [key: string]: string } = {
      'Peito': 'danger',
      'Costas': 'success',
      'Pernas': 'warning',
      'Braços': 'secondary',
      'Ombros': 'tertiary'
    };
    return colorMap[muscleGroup] || 'medium';
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    toast.present();
  }

  // Navigation methods
  navigateToExercises() {
    this.navigationService.navigateToExercisesList();
  }

  navigateToWorkouts() {
    this.navigationService.navigateToWorkoutPlans();
  }

  async startNewWorkout() {
    await this.deviceControlService.lockOrientation('portrait');
    this.navigationService.navigateToQuickWorkout();
  }

  // UI Methods
  toggleView() {
    this.viewMode = this.viewMode === 'charts' ? 'list' : 'charts';
    if (this.viewMode === 'charts') {
      setTimeout(() => {
        this.createWeightChart();
        this.createWorkoutChart();
      }, 100);
    }
  }

  changePeriod() {
    // Update data based on selected period
    this.updateStatsForPeriod();
  }

  updateStatsForPeriod() {
    // Mock data update based on period
    switch (this.selectedPeriod) {
      case 'week':
        this.weeklyChange = 5;
        this.calorieChange = 10;
        this.timeChange = 0;
        this.streakChange = 1;
        break;
      case 'month':
        this.weeklyChange = 15;
        this.calorieChange = 8;
        this.timeChange = 0;
        this.streakChange = 2;
        break;
      case 'year':
        this.weeklyChange = 25;
        this.calorieChange = 12;
        this.timeChange = 5;
        this.streakChange = 3;
        break;
    }
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Adicionar Dados',
      buttons: [
        {
          text: 'Registrar Peso',
          icon: 'scale-outline',
          handler: () => this.addWeight()
        },
        {
          text: 'Adicionar Medidas',
          icon: 'resize-outline',
          handler: () => this.addMeasurement()
        },
        {
          text: 'Definir Meta',
          icon: 'flag-outline',
          handler: () => this.addGoal()
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async addWeight() {
    const alert = await this.alertController.create({
      header: 'Registrar Peso',
      inputs: [
        {
          name: 'weight',
          type: 'number',
          placeholder: 'Peso em kg',
          attributes: {
            step: '0.1'
          }
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Salvar',
          handler: async (data: AlertData) => {
            if (data.weight && data.weight > 0) {
              await this.showToast(`Peso registrado: ${data.weight}kg`, 'success');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async addMeasurement() {
    const alert = await this.alertController.create({
      header: 'Adicionar Medidas',
      inputs: [
        {
          name: 'chest',
          type: 'number',
          placeholder: 'Peito (cm)'
        },
        {
          name: 'waist',
          type: 'number',
          placeholder: 'Cintura (cm)'
        },
        {
          name: 'arm',
          type: 'number',
          placeholder: 'Braço (cm)'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Salvar',
          handler: async () => {
            await this.showToast('Medidas registradas com sucesso!', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async addGoal() {
    const alert = await this.alertController.create({
      header: 'Definir Meta',
      inputs: [
        {
          name: 'goal',
          type: 'text',
          placeholder: 'Descrição da meta'
        },
        {
          name: 'target',
          type: 'number',
          placeholder: 'Valor alvo'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Criar Meta',
          handler: async (data: AlertData) => {
            if (data.goal && data.target) {
              await this.showToast('Meta criada com sucesso!', 'success');
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
