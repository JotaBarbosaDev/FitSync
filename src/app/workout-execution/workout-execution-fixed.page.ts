import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { WorkoutManagementService } from '../services/workout-management.service';
import { CustomWorkout, SessionExercise, CompletedSet } from '../models/workout-system.model';
import { WorkoutSession } from '../models/workout-system.model';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-workout-execution',
  templateUrl: './workout-execution.page.html',
  styleUrls: ['./workout-execution.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class WorkoutExecutionPage implements OnInit, OnDestroy {
  workoutId: string = '';
  workout: CustomWorkout | null = null;
  session: WorkoutSession | null = null;

  // Estado da execução
  currentExerciseIndex: number = 0;
  currentSetIndex: number = 0;
  isWorkoutStarted: boolean = false;
  isWorkoutPaused: boolean = false;
  isWorkoutCompleted: boolean = false;

  // Timer
  workoutDuration: number = 0; // em segundos
  restTime: number = 0; // tempo de descanso restante em segundos
  isResting: boolean = false;

  private timerSubscription?: Subscription;
  private restTimerSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    public router: Router, // Tornado público para o template
    private workoutService: WorkoutManagementService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController
  ) { }

  async ngOnInit() {
    this.workoutId = this.route.snapshot.paramMap.get('id') || '';
    if (this.workoutId) {
      await this.loadWorkout();
    }
  }

  ngOnDestroy() {
    this.stopTimers();
  }

  async loadWorkout() {
    try {
      this.workoutService.getWorkoutById(this.workoutId).subscribe(workout => {
        this.workout = workout;
        if (!this.workout) {
          this.showToast('Treino não encontrado', 'danger');
          this.router.navigate(['/workout-management']);
        }
      });
    } catch (error) {
      console.error('Erro ao carregar treino:', error);
      await this.showToast('Erro ao carregar treino', 'danger');
    }
  }

  async startWorkout() {
    if (!this.workout) return;

    try {
      this.workoutService.startWorkoutSession(this.workoutId).subscribe(session => {
        this.session = session;
        this.isWorkoutStarted = true;
        this.currentExerciseIndex = 0;
        this.currentSetIndex = 0;
        this.startWorkoutTimer();
        this.showToast('Treino iniciado! Boa sorte! 💪', 'success');
      });
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      await this.showToast('Erro ao iniciar treino', 'danger');
    }
  }

  async pauseWorkout() {
    this.isWorkoutPaused = !this.isWorkoutPaused;

    if (this.isWorkoutPaused) {
      this.stopTimers();
      await this.showToast('Treino pausado', 'warning');
    } else {
      this.startWorkoutTimer();
      if (this.isResting) {
        this.startRestTimer(this.restTime);
      }
      await this.showToast('Treino retomado', 'success');
    }
  }

  async completeSet(reps: number, weight?: number) {
    if (!this.session || !this.workout) return;

    try {
      const currentExercise = this.getCurrentExercise();
      if (!currentExercise) return;

      const completedSet: CompletedSet = {
        reps: reps,
        weight: weight,
        completed: true,
        startTime: new Date(),
        endTime: new Date()
      };

      this.workoutService.completeSet(
        this.session.id,
        this.currentExerciseIndex,
        completedSet
      ).subscribe(() => {
        this.showToast(`Série ${this.currentSetIndex + 1} concluída!`, 'success');

        // Verificar se há mais séries para este exercício
        if (this.currentSetIndex + 1 < currentExercise.sets.length) {
          this.currentSetIndex++;
          this.startRest();
        } else {
          // Ir para o próximo exercício
          this.nextExercise();
        }
      });

    } catch (error) {
      console.error('Erro ao completar série:', error);
      await this.showToast('Erro ao registrar série', 'danger');
    }
  }

  async nextExercise() {
    if (!this.workout) return;

    if (this.currentExerciseIndex + 1 < this.workout.exercises.length) {
      this.currentExerciseIndex++;
      this.currentSetIndex = 0;
      this.stopRestTimer();
      await this.showToast('Próximo exercício!', 'primary');
    } else {
      await this.completeWorkout();
    }
  }

  async startRest() {
    const currentExercise = this.getCurrentExercise();
    if (!currentExercise) return;

    const restDuration = currentExercise.restTime || 90; // Default 90 segundos
    this.restTime = restDuration;
    this.isResting = true;
    this.startRestTimer(restDuration);

    await this.showToast(`Descanso de ${restDuration}s iniciado`, 'medium');
  }

  async skipRest() {
    this.stopRestTimer();
    this.isResting = false;
    await this.showToast('Descanso pulado', 'primary');
  }

  async completeWorkout() {
    if (!this.session) return;

    try {
      this.workoutService.completeWorkoutSession().subscribe(completedSession => {
        this.isWorkoutCompleted = true;
        this.stopTimers();

        this.showCompletionAlert(completedSession);
      });

    } catch (error) {
      console.error('Erro ao finalizar treino:', error);
      await this.showToast('Erro ao finalizar treino', 'danger');
    }
  }

  async showCompletionAlert(session: WorkoutSession) {
    const alert = await this.alertController.create({
      header: '🎉 Treino Concluído!',
      message: `
        <div style="text-align: center;">
          <p><strong>Parabéns!</strong> Você completou seu treino!</p>
          <p>⏱️ Duração: ${this.formatDuration(this.workoutDuration)}</p>
          <p>🔥 Calorias: ~${session.caloriesBurned || 0}</p>
          <p>💪 Exercícios: ${this.workout?.exercises.length || 0}</p>
        </div>
      `,
      buttons: [
        {
          text: 'Ver Progresso',
          handler: () => {
            this.router.navigate(['/tabs/workout-progress']);
          }
        },
        {
          text: 'Finalizar',
          handler: () => {
            this.router.navigate(['/workout-management']);
          }
        }
      ]
    });

    await alert.present();
  }

  getCurrentExercise() {
    if (!this.workout || this.currentExerciseIndex >= this.workout.exercises.length) {
      return null;
    }
    return this.workout.exercises[this.currentExerciseIndex];
  }

  getCurrentSet() {
    const exercise = this.getCurrentExercise();
    if (!exercise) return null;
    return this.currentSetIndex + 1;
  }

  getTotalSets() {
    const exercise = this.getCurrentExercise();
    return exercise?.sets.length || 0;
  }

  getWorkoutProgress(): number {
    if (!this.workout) return 0;

    const totalExercises = this.workout.exercises.length;
    const completedExercises = this.currentExerciseIndex;
    const currentExerciseProgress = this.getCurrentExerciseProgress();

    return ((completedExercises + currentExerciseProgress) / totalExercises) * 100;
  }

  getCurrentExerciseProgress(): number {
    const exercise = this.getCurrentExercise();
    if (!exercise) return 0;

    return this.currentSetIndex / exercise.sets.length;
  }

  // Método para obter dados do exercício da biblioteca
  getExerciseData(exerciseId: string) {
    // Por enquanto retorna dados fictícios - deve integrar com a biblioteca de exercícios
    const exerciseLibrary: { [key: string]: any } = {
      'push-up': { name: 'Flexão', instructions: 'Deite de bruços, apoie as mãos no chão...' },
      'squat': { name: 'Agachamento', instructions: 'Fique em pé, pés afastados...' },
      'pull-up': { name: 'Barra fixa', instructions: 'Segure a barra com as mãos...' }
    };

    return exerciseLibrary[exerciseId] || {
      name: 'Exercício',
      instructions: 'Instruções não disponíveis'
    };
  }

  // Método para obter o nome do exercício atual
  getCurrentExerciseName(): string {
    const exercise = this.getCurrentExercise();
    if (!exercise) return '';
    return this.getExerciseData(exercise.exerciseId).name;
  }

  // Método para obter instruções do exercício atual
  getCurrentExerciseInstructions(): string {
    const exercise = this.getCurrentExercise();
    if (!exercise) return '';
    return this.getExerciseData(exercise.exerciseId).instructions;
  }

  // Getter para reps do set atual
  getCurrentSetReps(): number {
    const exercise = this.getCurrentExercise();
    if (!exercise || !exercise.sets[this.currentSetIndex]) return 0;
    return exercise.sets[this.currentSetIndex].reps || 0;
  }

  // Getter para peso do set atual
  getCurrentSetWeight(): number {
    const exercise = this.getCurrentExercise();
    if (!exercise || !exercise.sets[this.currentSetIndex]) return 0;
    return exercise.sets[this.currentSetIndex].weight || 0;
  }

  private startWorkoutTimer() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    this.timerSubscription = interval(1000).subscribe(() => {
      if (!this.isWorkoutPaused) {
        this.workoutDuration++;
      }
    });
  }

  private startRestTimer(duration: number) {
    if (this.restTimerSubscription) {
      this.restTimerSubscription.unsubscribe();
    }

    this.restTimerSubscription = interval(1000).subscribe(() => {
      if (!this.isWorkoutPaused && this.restTime > 0) {
        this.restTime--;

        if (this.restTime === 0) {
          this.stopRestTimer();
          this.isResting = false;
          this.showToast('Descanso finalizado! Próxima série!', 'success');
        }
      }
    });
  }

  private stopTimers() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    this.stopRestTimer();
  }

  private stopRestTimer() {
    if (this.restTimerSubscription) {
      this.restTimerSubscription.unsubscribe();
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  formatRestTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async showSetInputDialog() {
    const alert = await this.alertController.create({
      header: 'Registrar Série',
      message: 'Digite os dados da série completada:',
      inputs: [
        {
          name: 'reps',
          type: 'number',
          placeholder: 'Repetições',
          min: 1,
          max: 100
        },
        {
          name: 'weight',
          type: 'number',
          placeholder: 'Peso (kg) - opcional',
          min: 0,
          max: 500
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Registrar',
          handler: (data) => {
            const reps = parseInt(data.reps);
            const weight = data.weight ? parseFloat(data.weight) : undefined;

            if (reps && reps > 0) {
              this.completeSet(reps, weight);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmQuitWorkout() {
    const alert = await this.alertController.create({
      header: 'Sair do Treino',
      message: 'Tem certeza que deseja sair? O progresso será perdido.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sair',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.stopTimers();
            this.router.navigate(['/workout-management']);
          }
        }
      ]
    });

    await alert.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
