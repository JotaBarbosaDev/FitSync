import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { WorkoutManagementService } from '../services/workout-management.service';
import { DataService } from '../services/data.service';
import { ExerciseService, ExerciseLibraryItem } from '../services/exercise.service';
import { CustomWorkout, WorkoutExercise } from '../models/workout-system.model';

@Component({
  selector: 'app-workout-management',
  templateUrl: './workout-management.page.html',
  styleUrls: ['./workout-management.page.scss'],
  standalone: false
})
export class WorkoutManagementPage implements OnInit, OnDestroy {
  customWorkouts: CustomWorkout[] = [];
  exercises: ExerciseLibraryItem[] = [];
  isLoading = false;
  
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private workoutManagementService: WorkoutManagementService,
    private dataService: DataService,
    private exerciseService: ExerciseService
  ) { }

  async ngOnInit() {
    await this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async ionViewWillEnter() {
    // Evitar carregar dados duplamente se já foi carregado no ngOnInit
    if (this.customWorkouts.length === 0) {
      await this.loadData();
    }
  }

  private async loadData() {
    this.isLoading = true;
    try {
      // Limpar subscriptions anteriores para evitar duplicações
      this.subscriptions.unsubscribe();
      this.subscriptions = new Subscription();

      // Carregar treinos personalizados via subscription
      const workoutsSubscription = this.workoutManagementService.getCustomWorkouts().subscribe({
        next: (workouts) => {
          console.log('Treinos carregados:', workouts.length);
          this.customWorkouts = workouts;
        },
        error: (error) => {
          console.error('Erro ao carregar treinos:', error);
        }
      });
      this.subscriptions.add(workoutsSubscription);

      // Carregar exercícios da biblioteca via ExerciseService
      const exercisesSubscription = this.exerciseService.getExerciseLibrary().subscribe({
        next: (exercises) => {
          console.log('Exercícios carregados:', exercises.length);
          this.exercises = exercises;
        },
        error: (error) => {
          console.error('Erro ao carregar exercícios:', error);
        }
      });
      this.subscriptions.add(exercisesSubscription);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      await this.showToast('Erro ao carregar dados', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async createNewWorkout() {
    const alert = await this.alertController.create({
      header: 'Novo Treino',
      subHeader: 'Criar treino personalizado',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nome do treino',
          attributes: {
            maxlength: 50
          }
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Descrição (opcional)'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Criar',
          handler: async (data) => {
            if (data.name?.trim()) {
              await this.createWorkout(data.name.trim(), data.description?.trim() || '');
              return true;
            }
            await this.showToast('Nome do treino é obrigatório', 'warning');
            return false;
          }
        }
      ]
    });

    await alert.present();
  }

  private async createWorkout(name: string, description: string) {
    try {
      const workout: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
        name,
        description,
        exercises: [],
        category: 'mixed',
        difficulty: 'easy',
        estimatedDuration: 30,
        muscleGroups: [],
        equipment: [],
        isTemplate: false
      };

      this.workoutManagementService.createCustomWorkout(workout).subscribe({
        next: (created) => {
          this.showToast('Treino criado com sucesso!', 'success');
          // Não precisamos adicionar manualmente ao array, a subscription vai atualizar
          
          // Navegar para edição do treino
          this.editWorkout(created);
        },
        error: (error) => {
          console.error('Erro ao criar treino:', error);
          this.showToast('Erro ao criar treino', 'danger');
        }
      });
    } catch (error) {
      console.error('Erro ao criar treino:', error);
      await this.showToast('Erro ao criar treino', 'danger');
    }
  }

  async editWorkout(workout: CustomWorkout) {
    this.router.navigate(['/workout-management', 'edit', workout.id]);
  }

  async duplicateWorkout(workout: CustomWorkout) {
    const alert = await this.alertController.create({
      header: 'Duplicar Treino',
      message: `Deseja duplicar o treino "${workout.name}"?`,
      inputs: [
        {
          name: 'newName',
          type: 'text',
          placeholder: 'Nome do novo treino',
          value: `${workout.name} (Cópia)`
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Duplicar',
          handler: async (data) => {
            if (data.newName?.trim()) {
              await this.duplicateWorkoutAction(workout, data.newName.trim());
              return true;
            }
            return false;
          }
        }
      ]
    });

    await alert.present();
  }

  private async duplicateWorkoutAction(workout: CustomWorkout, newName: string) {
    try {
      // Create a duplicate by creating a new workout with the same properties
      const duplicatedWorkout: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
        name: newName,
        description: workout.description,
        exercises: workout.exercises,
        category: workout.category,
        difficulty: workout.difficulty,
        estimatedDuration: workout.estimatedDuration,
        muscleGroups: workout.muscleGroups,
        equipment: workout.equipment,
        isTemplate: workout.isTemplate
      };

      this.workoutManagementService.createCustomWorkout(duplicatedWorkout).subscribe({
        next: (created) => {
          this.showToast('Treino duplicado com sucesso!', 'success');
          this.customWorkouts.unshift(created);
        },
        error: (error) => {
          console.error('Erro ao duplicar treino:', error);
          this.showToast('Erro ao duplicar treino', 'danger');
        }
      });
    } catch (error) {
      console.error('Erro ao duplicar treino:', error);
      await this.showToast('Erro ao duplicar treino', 'danger');
    }
  }

  async deleteWorkout(workout: CustomWorkout) {
    const alert = await this.alertController.create({
      header: 'Excluir Treino',
      message: `Tem certeza que deseja excluir o treino "${workout.name}"? Esta ação não pode ser desfeita.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: async () => {
            await this.deleteWorkoutAction(workout);
          }
        }
      ]
    });

    await alert.present();
  }

  private async deleteWorkoutAction(workout: CustomWorkout) {
    try {
      await this.workoutManagementService.deleteCustomWorkout(workout.id);
      await this.showToast('Treino excluído com sucesso!', 'success');
      this.customWorkouts = this.customWorkouts.filter(w => w.id !== workout.id);
    } catch (error) {
      console.error('Erro ao excluir treino:', error);
      await this.showToast('Erro ao excluir treino', 'danger');
    }
  }

  async startWorkout(workout: CustomWorkout) {
    if (workout.exercises.length === 0) {
      await this.showToast('Este treino não possui exercícios', 'warning');
      return;
    }

    try {
      const sessionId = await this.workoutManagementService.startWorkoutSession(workout.id);
      this.router.navigate(['/workout-execution', sessionId]);
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      await this.showToast('Erro ao iniciar treino', 'danger');
    }
  }

  getDifficultyColor(difficulty: string): string {
    const colors = {
      'easy': 'success',
      'medium': 'warning',
      'hard': 'danger'
    };
    return colors[difficulty as keyof typeof colors] || 'medium';
  }

  getDifficultyLabel(difficulty: string): string {
    const labels = {
      'easy': 'Fácil',
      'medium': 'Médio',
      'hard': 'Difícil'
    };
    return labels[difficulty as keyof typeof labels] || difficulty;
  }

  getCategoryIcon(category: string): string {
    const icons = {
      'strength': 'barbell',
      'cardio': 'heart',
      'flexibility': 'body',
      'custom': 'create'
    };
    return icons[category as keyof typeof icons] || 'fitness';
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  goToWeeklyPlan() {
    this.router.navigate(['/weekly-plan']);
  }

  goToWorkoutProgress() {
    this.router.navigate(['/workout-progress']);
  }

  getActiveWorkouts(): number {
    return this.customWorkouts.length;
  }

  getTotalDuration(): number {
    return this.customWorkouts.reduce((total, workout) => total + workout.estimatedDuration, 0);
  }

  getMuscleGroupName(groupId: string): string {
    const groups = {
      'chest': 'Peito',
      'back': 'Costas',
      'shoulders': 'Ombros',
      'arms': 'Braços',
      'legs': 'Pernas',
      'core': 'Abdômen',
      'cardio': 'Cardio',
      'full-body': 'Corpo Inteiro'
    };
    return groups[groupId as keyof typeof groups] || groupId;
  }

  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  trackByWorkoutId(index: number, workout: CustomWorkout): string {
    return workout.id;
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
