import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ProgressDataService } from '../services/progress-data.service';

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  instructions: string;
  difficulty: string;
  duration?: number;
  calories?: number;
  emoji?: string;
  description?: string;
  completed?: boolean;
}

@Component({
  selector: 'app-workout-execution',
  templateUrl: './workout-execution.page.html',
  styleUrls: ['./workout-execution.page.scss'],
  standalone: false
})
export class WorkoutExecutionPage implements OnInit, OnDestroy {
  // Propriedades principais
  exercises: Exercise[] = [];
  dayName: string = '';
  source: string = '';
  currentExerciseIndex: number = 0;
  completedExercises: number = 0;
  isWorkoutStarted: boolean = false;
  isWorkoutCompleted: boolean = false;
  workoutDuration: number = 0;
  private workoutTimer: any;
  private workoutStartTime: Date | null = null;
  private completedExerciseData: any[] = [];
  
  // Getters for template compatibility
  get workoutStarted(): boolean {
    return this.isWorkoutStarted;
  }
  
  get workoutCompleted(): boolean {
    return this.isWorkoutCompleted;
  }

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private progressDataService: ProgressDataService
  ) { }

  ngOnInit() {
    this.loadExercisesFromUrl();
    this.progressDataService.init();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  private loadExercisesFromUrl() {
    this.route.queryParams.subscribe(params => {
      try {
        if (params['exercises']) {
          this.exercises = JSON.parse(decodeURIComponent(params['exercises']));
          this.exercises = this.exercises.map(ex => ({ ...ex, completed: false }));
        }
        this.dayName = params['dayName'] || 'Hoje';
        this.source = params['source'] || 'unknown';

        console.log('Exercícios carregados:', this.exercises);
        console.log('Dia:', this.dayName);
        console.log('Origem:', this.source);
      } catch (error) {
        console.error('Erro ao parsear exercícios da URL:', error);
        this.showErrorToast('Erro ao carregar exercícios. Verifique os dados.');
        this.router.navigate(['/tabs/home']);
      }
    });
  }

  startWorkout() {
    if (this.exercises.length === 0) {
      this.showErrorToast('Nenhum exercício disponível para treino.');
      return;
    }

    this.isWorkoutStarted = true;
    this.workoutDuration = 0;
    this.workoutStartTime = new Date();
    this.completedExerciseData = [];
    this.startTimer();
    console.log('Treino iniciado!');
  }

  private startTimer() {
    this.workoutTimer = setInterval(() => {
      this.workoutDuration++;
    }, 1000);
  }

  private stopTimer() {
    if (this.workoutTimer) {
      clearInterval(this.workoutTimer);
      this.workoutTimer = null;
    }
  }

  finishCurrentExercise() {
    if (this.currentExerciseIndex < this.exercises.length) {
      this.completeCurrentExercise();
    }
  }

  private async completeCurrentExercise() {
    if (this.currentExerciseIndex < this.exercises.length) {
      const currentExercise = this.exercises[this.currentExerciseIndex];
      currentExercise.completed = true;
      this.completedExercises++;

      // Salvar dados do exercício completado
      const exerciseData = {
        exerciseId: currentExercise.id,
        exerciseName: currentExercise.name,
        muscleGroup: currentExercise.muscleGroups[0] || 'unknown',
        completedAt: new Date(),
        duration: currentExercise.duration || 0,
        calories: currentExercise.calories || 0,
        difficulty: currentExercise.difficulty,
        // Simular dados de séries - em uma implementação real, você coletaria esses dados do usuário
        sets: [
          { reps: 12, weight: 0, rpe: 7 },
          { reps: 10, weight: 0, rpe: 8 },
          { reps: 8, weight: 0, rpe: 9 }
        ]
      };

      this.completedExerciseData.push(exerciseData);

      const toast = await this.toastController.create({
        message: `✅ ${currentExercise.name} concluído!`,
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      // Se não é o último exercício, vai para o próximo
      if (this.currentExerciseIndex < this.exercises.length - 1) {
        this.currentExerciseIndex++;
      } else {
        // Se é o último exercício, finaliza o treino
        this.completeWorkout();
      }
    }
  }

  private async completeWorkout() {
    this.isWorkoutCompleted = true;
    this.stopTimer();

    // Salvar sessão de treino no sistema de progresso
    await this.saveWorkoutSession();

    const alert = await this.alertController.create({
      header: '🎉 Parabéns!',
      message: `Você completou o treino de ${this.dayName}!\n\nDuração: ${this.formatDuration(this.workoutDuration)}\nExercícios: ${this.completedExercises}/${this.exercises.length}\n\n📊 Dados salvos no seu progresso!`,
      buttons: [
        {
          text: 'Repetir Treino',
          handler: () => {
            this.repeatWorkout();
          }
        },
        {
          text: 'Ver Progresso',
          handler: () => {
            this.router.navigate(['/tabs/workout-progress']);
          }
        },
        {
          text: 'Voltar ao Início',
          handler: () => {
            this.router.navigate(['/tabs/home']);
          }
        }
      ]
    });
    await alert.present();
  }

  async finishWorkout() {
    const alert = await this.alertController.create({
      header: 'Finalizar Treino',
      message: 'Tem certeza que deseja finalizar o treino agora?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Finalizar',
          handler: async () => {
            // Salvar dados mesmo para treino incompleto
            if (this.completedExerciseData.length > 0) {
              await this.saveWorkoutSession();
            }
            this.completeWorkout();
          }
        }
      ]
    });
    await alert.present();
  }

  async goBack() {
    if (this.isWorkoutStarted && !this.isWorkoutCompleted) {
      const alert = await this.alertController.create({
        header: 'Abandonar Treino',
        message: 'Tem certeza que deseja sair? O progresso será perdido.',
        buttons: [
          {
            text: 'Continuar Treino',
            role: 'cancel'
          },
          {
            text: 'Sair',
            handler: () => {
              this.router.navigate(['/tabs/home']);
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.router.navigate(['/tabs/home']);
    }
  }

  // Getters para a template
  get currentExercise(): Exercise | null {
    return this.exercises[this.currentExerciseIndex] || null;
  }

  getCurrentExercise(): Exercise | null {
    return this.currentExercise;
  }

  get progressPercentage(): number {
    if (this.exercises.length === 0) return 0;
    return Math.round((this.completedExercises / this.exercises.length) * 100);
  }

  get totalExercises(): number {
    return this.exercises.length;
  }

  get currentExerciseNumber(): number {
    return this.currentExerciseIndex + 1;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'iniciante':
      case 'beginner':
        return 'success';
      case 'intermediário':
      case 'intermediate':
        return 'warning';
      case 'avançado':
      case 'advanced':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      arms: 'barbell-outline',
      chest: 'fitness-outline',
      legs: 'walk-outline',
      back: 'body-outline',
      shoulders: 'triangle-outline',
      cardio: 'heart-outline',
      core: 'radio-button-on-outline'
    };
    return icons[category] || 'fitness-outline';
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Additional methods referenced in template
  getTotalCalories(): number {
    return this.exercises.reduce((total, exercise) => total + (exercise.calories || 50), 0);
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
      case 'iniciante':
        return 'Iniciante';
      case 'intermediate':
      case 'intermediário':
        return 'Intermediário';
      case 'advanced':
      case 'avançado':
        return 'Avançado';
      default:
        return 'Intermediário';
    }
  }

  previousExercise() {
    if (this.currentExerciseIndex > 0) {
      this.currentExerciseIndex--;
    }
  }

  nextExercise() {
    if (this.currentExerciseIndex < this.exercises.length - 1) {
      this.currentExerciseIndex++;
    }
  }

  async repeatWorkout() {
    const alert = await this.alertController.create({
      header: '🔄 Repetir Treino',
      message: 'Deseja repetir este treino? Todos os exercícios serão reiniciados.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sim, repetir',
          handler: () => {
            this.restartWorkout();
          }
        }
      ]
    });

    await alert.present();
  }

  private restartWorkout() {
    // Reset all exercise completion status
    this.exercises = this.exercises.map(exercise => ({
      ...exercise,
      completed: false
    }));

    // Reset workout state
    this.currentExerciseIndex = 0;
    this.completedExercises = 0;
    this.isWorkoutCompleted = false;
    this.workoutDuration = 0;
    this.workoutStartTime = null;
    this.completedExerciseData = [];

    // Stop any existing timer
    this.stopTimer();

    // Show success message
    this.showToast('🔄 Treino reiniciado! Vamos começar novamente!', 'success');

    // Auto-start the workout
    setTimeout(() => {
      this.startWorkout();
    }, 500);
  }

  private async saveWorkoutSession() {
    if (!this.workoutStartTime) return;

    try {
      // Calcular duração total
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - this.workoutStartTime.getTime()) / 60000);

      // Calcular volume total e calorias
      const totalVolume = this.completedExerciseData.reduce((total, exercise) => {
        return total + exercise.sets.reduce((setTotal: number, set: any) => {
          return setTotal + (set.reps * set.weight);
        }, 0);
      }, 0);

      const totalCalories = this.completedExerciseData.reduce((total, exercise) => {
        return total + (exercise.calories || 0);
      }, 0);

      // Criar dados da sessão para o ProgressDataService
      const workoutSession = {
        date: this.workoutStartTime.toISOString(),
        exercises: this.completedExerciseData.map(exercise => ({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets,
          totalVolume: exercise.sets.reduce((total: number, set: any) => total + (set.reps * set.weight), 0),
          muscleGroup: exercise.muscleGroup
        })),
        duration: durationMinutes,
        totalVolume: totalVolume,
        muscleGroups: [...new Set(this.completedExerciseData.map(ex => ex.muscleGroup))],
        notes: `Treino de ${this.dayName} - ${this.completedExercises} exercícios completados`
      };

      // Salvar usando o ProgressDataService
      await this.progressDataService.addWorkoutSession(workoutSession);

      // Mostrar toast de confirmação
      const toast = await this.toastController.create({
        message: '✅ Dados do treino salvos com sucesso!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      console.error('Erro ao salvar sessão de treino:', error);

      const toast = await this.toastController.create({
        message: '⚠️ Erro ao salvar dados do treino',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
    }
  }
}
