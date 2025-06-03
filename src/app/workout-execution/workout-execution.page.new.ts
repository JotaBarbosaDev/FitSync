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
    this.route.queryParams.subscribe(async params => {
      console.log('WorkoutExecutionPage: Parâmetros recebidos', params);
      
      // Verificar se recebemos exercícios como parâmetro
      if (params['exercises']) {
        try {
          const exercisesList = JSON.parse(params['exercises']);
          console.log('WorkoutExecutionPage: Exercícios recebidos:', exercisesList);
          const dayName = params['dayName'] || 'Hoje';
          
          // Criar um treino temporário com os exercícios recebidos
          this.workout = {
            id: `today-${new Date().toISOString()}`,
            name: `Treino de ${dayName}`,
            description: 'Treino do dia',
            difficulty: 'medium',
            muscleGroups: this.extractMuscleGroups(exercisesList),
            equipment: [],
            isTemplate: false,
            category: 'strength',
            estimatedDuration: exercisesList.length * 5,
            exercises: exercisesList.map((ex: any, index: number) => ({
              id: `exercise-${index}`,
              exerciseId: ex.id,
              order: index + 1,
              sets: [{id: `set-${index}-1`, reps: 12, weight: 0, completed: false}],
              restTime: 60,
              notes: ''
            })),
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          console.log('WorkoutExecutionPage: Treino criado a partir dos exercícios:', this.workout);
        } catch (error) {
          console.error('WorkoutExecutionPage: Erro ao processar exercícios:', error);
          await this.showToast('Erro ao carregar exercícios do treino', 'danger');
        }
      } 
      // Se temos o ID do treino, carregá-lo do serviço
      else if (params['workoutId']) {
        this.workoutId = params['workoutId'];
        await this.loadWorkout();
      }
      // Se não temos nenhum parâmetro válido
      else {
        this.workoutId = this.route.snapshot.paramMap.get('id') || '';
        if (this.workoutId) {
          await this.loadWorkout();
        } else {
          console.error('WorkoutExecutionPage: Nenhum treino ou exercício especificado');
          await this.showToast('Nenhum treino especificado', 'danger');
          this.router.navigate(['/tabs/home']);
        }
      }
    });
  }

  ngOnDestroy() {
    this.stopTimers();
  }

  // Método para extrair grupos musculares de uma lista de exercícios
  private extractMuscleGroups(exercises: any[]): string[] {
    if (!exercises || !Array.isArray(exercises)) return [];
    
    const muscleGroups = new Set<string>();
    exercises.forEach(exercise => {
      if (exercise.muscleGroups && Array.isArray(exercise.muscleGroups)) {
        exercise.muscleGroups.forEach((group: string) => muscleGroups.add(group));
      }
    });
    
    return Array.from(muscleGroups);
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

  // (Resto do código original permanece igual...)

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
