import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';

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

@Component({
  selector: 'app-progresso',
  templateUrl: './progresso.page.html',
  styleUrls: ['./progresso.page.scss'],
})
export class ProgressoPage implements OnInit, AfterViewInit {
  @ViewChild('weightChart', { static: false }) weightChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('workoutChart', { static: false }) workoutChartRef!: ElementRef<HTMLCanvasElement>;

  viewMode: 'charts' | 'list' = 'charts';
  selectedPeriod: 'week' | 'month' | 'year' = 'month';

  // Overview stats
  totalWorkouts: number = 28;
  totalCalories: number = 3240;
  totalMinutes: number = 1260;
  currentStreak: number = 7;
  weeklyChange: number = 15;
  calorieChange: number = 8;
  timeChange: number = 0;
  streakChange: number = 2;

  muscleGroupStats: MuscleGroupStat[] = [
    { name: 'Peito', icon: 'body-outline', color: 'danger', percentage: 25, workouts: 7 },
    { name: 'Costas', icon: 'person-outline', color: 'success', percentage: 22, workouts: 6 },
    { name: 'Pernas', icon: 'walk-outline', color: 'warning', percentage: 20, workouts: 6 },
    { name: 'Braços', icon: 'barbell-outline', color: 'secondary', percentage: 18, workouts: 5 },
    { name: 'Ombros', icon: 'arrow-up-outline', color: 'tertiary', percentage: 10, workouts: 3 },
    { name: 'Abdômen', icon: 'diamond-outline', color: 'medium', percentage: 5, workouts: 1 }
  ];

  recentAchievements: Achievement[] = [
    {
      id: '1',
      title: 'Primeira Semana',
      description: 'Complete 7 dias consecutivos de treino',
      icon: 'calendar-outline',
      unlocked: true,
      progress: 100,
      current: 7,
      target: 7,
      unlockedDate: new Date('2025-05-21')
    },
    {
      id: '2',
      title: 'Queimador de Calorias',
      description: 'Queime 1000 calorias em uma semana',
      icon: 'flame-outline',
      unlocked: true,
      progress: 100,
      current: 1240,
      target: 1000,
      unlockedDate: new Date('2025-05-23')
    },
    {
      id: '3',
      title: 'Maratonista',
      description: 'Acumule 10 horas de treino',
      icon: 'time-outline',
      unlocked: false,
      progress: 84,
      current: 8.4,
      target: 10
    },
    {
      id: '4',
      title: 'Força Total',
      description: 'Treine todos os grupos musculares',
      icon: 'fitness-outline',
      unlocked: false,
      progress: 83,
      current: 5,
      target: 6
    }
  ];

  workoutHistory: WorkoutHistory[] = [
    {
      id: '1',
      name: 'Treino de Peito e Tríceps',
      date: new Date('2025-05-27'),
      duration: 45,
      exercises: 6,
      calories: 180,
      sets: 18,
      muscleGroups: ['Peito', 'Tríceps']
    },
    {
      id: '2',
      name: 'Treino de Costas e Bíceps',
      date: new Date('2025-05-25'),
      duration: 50,
      exercises: 7,
      calories: 200,
      sets: 21,
      muscleGroups: ['Costas', 'Bíceps']
    },
    {
      id: '3',
      name: 'Treino de Pernas',
      date: new Date('2025-05-23'),
      duration: 60,
      exercises: 8,
      calories: 250,
      sets: 24,
      muscleGroups: ['Quadríceps', 'Glúteos', 'Panturrilha']
    },
    {
      id: '4',
      name: 'Treino de Ombros',
      date: new Date('2025-05-21'),
      duration: 40,
      exercises: 5,
      calories: 150,
      sets: 15,
      muscleGroups: ['Ombros', 'Trapézio']
    },
    {
      id: '5',
      name: 'Treino Full Body',
      date: new Date('2025-05-19'),
      duration: 55,
      exercises: 9,
      calories: 220,
      sets: 27,
      muscleGroups: ['Peito', 'Costas', 'Pernas', 'Braços']
    }
  ];

  personalRecords: PersonalRecord[] = [
    {
      id: '1',
      exercise: 'Supino Reto',
      value: 80,
      unit: 'kg',
      date: new Date('2025-05-25'),
      icon: 'barbell-outline',
      improvement: 5
    },
    {
      id: '2',
      exercise: 'Agachamento',
      value: 100,
      unit: 'kg',
      date: new Date('2025-05-23'),
      icon: 'fitness-outline',
      improvement: 10
    },
    {
      id: '3',
      exercise: 'Levantamento Terra',
      value: 120,
      unit: 'kg',
      date: new Date('2025-05-20'),
      icon: 'barbell-outline',
      improvement: 15
    },
    {
      id: '4',
      exercise: 'Desenvolvimento',
      value: 50,
      unit: 'kg',
      date: new Date('2025-05-18'),
      icon: 'arrow-up-outline',
      improvement: 5
    },
    {
      id: '5',
      exercise: 'Barra Fixa',
      value: 12,
      unit: 'reps',
      date: new Date('2025-05-15'),
      icon: 'fitness-outline',
      improvement: 3
    },
    {
      id: '6',
      exercise: 'Prancha',
      value: 120,
      unit: 'seg',
      date: new Date('2025-05-10'),
      icon: 'timer-outline',
      improvement: 30
    }
  ];

  constructor(
    private actionSheetController: ActionSheetController,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Initialize component
  }

  ngAfterViewInit() {
    // Initialize charts after view is ready
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  toggleView() {
    this.viewMode = this.viewMode === 'charts' ? 'list' : 'charts';
    if (this.viewMode === 'charts') {
      setTimeout(() => {
        this.initializeCharts();
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
        this.totalWorkouts = 5;
        this.totalCalories = 1200;
        this.totalMinutes = 300;
        break;
      case 'month':
        this.totalWorkouts = 28;
        this.totalCalories = 3240;
        this.totalMinutes = 1260;
        break;
      case 'year':
        this.totalWorkouts = 156;
        this.totalCalories = 18500;
        this.totalMinutes = 7200;
        break;
    }
  }

  initializeCharts() {
    this.createWeightChart();
    this.createWorkoutChart();
  }

  createWeightChart() {
    if (!this.weightChartRef) return;

    const ctx = this.weightChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Mock weight data
    const weightData = [78, 77.5, 77.8, 77.2, 76.9, 76.5, 76.8, 76.3];
    const targetWeight = 75;
    const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

    // Simple canvas chart implementation
    this.drawLineChart(ctx, labels, weightData, targetWeight);
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

  drawLineChart(ctx: CanvasRenderingContext2D, labels: string[], data: number[], target: number) {
    const canvas = ctx.canvas;
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const chartWidth = width / 2 - 80;
    const chartHeight = height / 2 - 80;
    const startX = 40;
    const startY = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width / 2, height / 2);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = startY + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + chartWidth, y);
      ctx.stroke();
    }

    // Draw weight line
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const maxValue = Math.max(...data, target);
    const minValue = Math.min(...data, target);
    const range = maxValue - minValue || 1;

    data.forEach((value, index) => {
      const x = startX + (chartWidth / (data.length - 1)) * index;
      const y = startY + chartHeight - ((value - minValue) / range) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw target line
    ctx.strokeStyle = '#764ba2';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const targetY = startY + chartHeight - ((target - minValue) / range) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(startX, targetY);
    ctx.lineTo(startX + chartWidth, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw data points
    ctx.fillStyle = '#667eea';
    data.forEach((value, index) => {
      const x = startX + (chartWidth / (data.length - 1)) * index;
      const y = startY + chartHeight - ((value - minValue) / range) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
      const x = startX + (chartWidth / (labels.length - 1)) * index;
      ctx.fillText(label, x, startY + chartHeight + 20);
    });
  }

  drawBarChart(ctx: CanvasRenderingContext2D, labels: string[], data: number[]) {
    const canvas = ctx.canvas;
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const chartWidth = width / 2 - 80;
    const chartHeight = height / 2 - 80;
    const startX = 40;
    const startY = 40;
    const barWidth = chartWidth / data.length * 0.6;
    const barSpacing = chartWidth / data.length * 0.4;

    // Clear canvas
    ctx.clearRect(0, 0, width / 2, height / 2);

    const maxValue = Math.max(...data);

    // Draw bars
    data.forEach((value, index) => {
      const x = startX + (chartWidth / data.length) * index + barSpacing / 2;
      const barHeight = (value / maxValue) * chartHeight;
      const y = startY + chartHeight - barHeight;

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Value labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
    });

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
      const x = startX + (chartWidth / labels.length) * index + (chartWidth / labels.length) / 2;
      ctx.fillText(label, x, startY + chartHeight + 20);
    });
  }

  getMuscleGroupColor(muscleGroup: string): string {
    const colorMap: { [key: string]: string } = {
      'Peito': 'danger',
      'Costas': 'success',
      'Pernas': 'warning',
      'Braços': 'secondary',
      'Ombros': 'tertiary',
      'Abdômen': 'medium',
      'Quadríceps': 'warning',
      'Glúteos': 'warning',
      'Panturrilha': 'warning',
      'Bíceps': 'secondary',
      'Tríceps': 'secondary',
      'Trapézio': 'tertiary'
    };
    return colorMap[muscleGroup] || 'primary';
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
          handler: async (data) => {
            if (data.weight && data.weight > 0) {
              const toast = await this.toastController.create({
                message: `Peso registrado: ${data.weight}kg`,
                duration: 2000,
                position: 'bottom',
                color: 'success'
              });
              toast.present();
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
          handler: async (data) => {
            const toast = await this.toastController.create({
              message: 'Medidas registradas com sucesso!',
              duration: 2000,
              position: 'bottom',
              color: 'success'
            });
            toast.present();
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
          handler: async (data) => {
            if (data.goal && data.target) {
              const toast = await this.toastController.create({
                message: 'Meta criada com sucesso!',
                duration: 2000,
                position: 'bottom',
                color: 'success'
              });
              toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
