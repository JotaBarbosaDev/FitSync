import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

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
  exercises: Exercise[] = [];
  dayName = '';
  source = '';
  currentExerciseIndex = 0;
  completedExercises = 0;
  workoutStarted = false;
  workoutCompleted = false;
  workoutDuration = 0;
  private workoutTimer: any;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.loadExercisesFromUrl();
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
        this.router.navigate(['/home']);
      }
    });
  }

  startWorkout() {
    if (this.exercises.length === 0) {
      this.showErrorToast('Nenhum exercício disponível para treino.');
      return;
    }

    this.workoutStarted = true;
    this.workoutDuration = 0;
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
      this.exercises[this.currentExerciseIndex].completed = true;
      this.completedExercises++;

      const toast = await this.toastController.create({
        message: `✅ ${this.exercises[this.currentExerciseIndex].name} concluído!`,
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
    this.workoutCompleted = true;
    this.stopTimer();

    const alert = await this.alertController.create({
      header: '🎉 Parabéns!',
      message: `Você completou o treino de ${this.dayName}!\n\nDuração: ${this.formatDuration(this.workoutDuration)}\nExercícios: ${this.completedExercises}/${this.exercises.length}`,
      buttons: [
        {
          text: 'Ver Progresso',
          handler: () => {
            this.router.navigate(['/workout-progress']);
          }
        },
        {
          text: 'Voltar ao Início',
          handler: () => {
            this.router.navigate(['/home']);
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
          handler: () => {
            this.completeWorkout();
          }
        }
      ]
    });
    await alert.present();
  }

  async goBack() {
    if (this.workoutStarted && !this.workoutCompleted) {
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
              this.router.navigate(['/home']);
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.router.navigate(['/home']);
    }
  }

  // Getters para a template
  get currentExercise(): Exercise | null {
    return this.exercises[this.currentExerciseIndex] || null;
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
}
