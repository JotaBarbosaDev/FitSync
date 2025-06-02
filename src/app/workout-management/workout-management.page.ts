import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { WorkoutManagementService } from '../services/workout-management.service';
import { DataService } from '../services/data.service';
import { CustomWorkout, WorkoutExercise, ExerciseLibraryItem } from '../models/workout-system.model';

@Component({
  selector: 'app-workout-management',
  templateUrl: './workout-management.page.html',
  styleUrls: ['./workout-management.page.scss'],
  standalone: false
})
export class WorkoutManagementPage implements OnInit {
  customWorkouts: CustomWorkout[] = [];
  exercises: ExerciseLibraryItem[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private workoutManagementService: WorkoutManagementService,
    private dataService: DataService
  ) { }

  async ngOnInit() {
    await this.loadData();
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  private async loadData() {
    this.isLoading = true;
    try {
      this.customWorkouts = await this.workoutManagementService.getCustomWorkouts();
      this.exercises = await this.dataService.getExercises();
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
      const workout: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        description,
        exercises: [],
        category: 'custom',
        difficulty: 'beginner',
        estimatedDuration: 30,
        targetMuscleGroups: [],
        equipment: [],
        caloriesPerMinute: 5
      };

      const created = await this.workoutManagementService.createCustomWorkout(workout);
      await this.showToast('Treino criado com sucesso!', 'success');
      this.customWorkouts.unshift(created);
      
      // Navegar para edição do treino
      this.editWorkout(created);
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
      const duplicated = await this.workoutManagementService.duplicateCustomWorkout(workout.id, newName);
      await this.showToast('Treino duplicado com sucesso!', 'success');
      this.customWorkouts.unshift(duplicated);
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
      'beginner': 'success',
      'intermediate': 'warning', 
      'advanced': 'danger'
    };
    return colors[difficulty as keyof typeof colors] || 'medium';
  }

  getDifficultyLabel(difficulty: string): string {
    const labels = {
      'beginner': 'Iniciante',
      'intermediate': 'Intermediário',
      'advanced': 'Avançado'
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
    return this.customWorkouts.filter(w => w.exercises.length > 0).length;
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
      'cardio': 'Cardio'
    };
    return groups[groupId as keyof typeof groups] || groupId;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
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
