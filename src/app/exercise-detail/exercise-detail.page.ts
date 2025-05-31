import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JsonDataService, ExerciseData } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';
import { DeviceControlService } from '../services/device-control.service';
import { AlertController, ToastController, ActionSheetController } from '@ionic/angular';

// Interfaces para tipagem
interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName?: string;
  weight: number;
  reps: number;
  sets: number;
  date: Date;
  oneRepMax: number;
}

interface PersonalRecordData {
  weight: string;
  reps: string;
  sets: string;
}

interface WorkoutEntry {
  exerciseId: string;
  exerciseName?: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
  date: Date;
  completed: boolean;
}

interface TimerUpdateEvent {
  detail?: number;
}

@Component({
  selector: 'app-exercise-detail',
  templateUrl: './exercise-detail.page.html',
  styleUrls: ['./exercise-detail.page.scss'],
  standalone: false
})
export class ExerciseDetailPage implements OnInit, OnDestroy {
  exercise: ExerciseData | null = null;
  exerciseId: string = '';
  loading: boolean = true;
  isLoading: boolean = true;
  isFavorite: boolean = false;
  relatedExercises: ExerciseData[] = [];
  userNotes: string = '';
  personalRecords: PersonalRecord[] = [];
  isOrientationLocked: boolean = false;

  // Timer properties
  timerSeconds: number = 0;
  isTimerRunning: boolean = false;
  private timerInterval?: ReturnType<typeof setInterval>;

  // Workout data
  workoutData = {
    sets: 3,
    reps: 10,
    weight: 0,
    notes: ''
  };

  constructor(
    private route: ActivatedRoute,
    private jsonDataService: JsonDataService,
    private navigationService: NavigationService,
    private storageService: StorageService,
    private deviceControlService: DeviceControlService,
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {}

  async ngOnInit() {
    // Lock orientation for this page
    await this.deviceControlService.lockToPortrait();
    
    // Get exercise ID from route parameters
    this.exerciseId = String(this.navigationService.getRouteParams(this.route)['id'] || '');
    
    // Get query parameters (for additional context)
    const queryParams = this.navigationService.getQueryParams(this.route);
    console.log('Query params:', queryParams);
    
    await this.loadExerciseData();
    await this.checkIfFavorite();
    await this.loadUserNotes();
    await this.loadPersonalRecords();
  }

  async ngOnDestroy() {
    // Allow orientation changes when leaving
    await this.deviceControlService.allowLandscape();
  }

  async loadExerciseData() {
    try {
      this.loading = true;
      this.isLoading = true;
      
      // Load exercise from JSON data service
      this.exercise = await this.jsonDataService.getExercise(this.exerciseId);
      
      if (this.exercise) {
        // Load related exercises from same muscle group
        this.relatedExercises = await this.jsonDataService.getExercisesByMuscleGroup(
          this.exercise.muscleGroup
        );
        
        // Remove current exercise from related
        this.relatedExercises = this.relatedExercises.filter(ex => ex.id !== this.exerciseId);
      }
      
    } catch (error) {
      console.error('Error loading exercise data:', error);
      await this.showErrorToast('Erro ao carregar dados do exercício');
    } finally {
      this.loading = false;
      this.isLoading = false;
    }
  }

  async checkIfFavorite() {
    try {
      const favorites = await this.storageService.get<string[]>('favoriteExercises') || [];
      this.isFavorite = favorites.includes(this.exerciseId);
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  }

  async toggleFavorite() {
    try {
      const favorites = await this.storageService.get<string[]>('favoriteExercises') || [];
      
      if (this.isFavorite) {
        // Remove from favorites
        const index = favorites.indexOf(this.exerciseId);
        if (index > -1) {
          favorites.splice(index, 1);
        }
        this.isFavorite = false;
        await this.showToast('Removido dos favoritos');
      } else {
        // Add to favorites
        favorites.push(this.exerciseId);
        this.isFavorite = true;
        await this.showToast('Adicionado aos favoritos');
      }
      
      await this.storageService.set('favoriteExercises', favorites);
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      await this.showErrorToast('Erro ao atualizar favoritos');
    }
  }

  async loadUserNotes() {
    try {
      const notes = await this.storageService.get<string>(`exerciseNotes_${this.exerciseId}`);
      this.userNotes = notes || '';
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  }

  async saveUserNotes() {
    try {
      await this.storageService.set(`exerciseNotes_${this.exerciseId}`, this.userNotes);
      await this.showToast('Notas salvas');
    } catch (error) {
      console.error('Error saving notes:', error);
      await this.showErrorToast('Erro ao salvar notas');
    }
  }

  async loadPersonalRecords() {
    try {
      const allRecords = await this.storageService.get<PersonalRecord[]>('personalRecords') || [];
      this.personalRecords = allRecords.filter((record: PersonalRecord) => 
        record.exerciseId === this.exerciseId
      );
    } catch (error) {
      console.error('Error loading personal records:', error);
    }
  }

  async addPersonalRecord() {
    const alert = await this.alertController.create({
      header: 'Novo Recorde Pessoal',
      inputs: [
        {
          name: 'weight',
          type: 'number',
          placeholder: 'Peso (kg)',
          min: 0
        },
        {
          name: 'reps',
          type: 'number',
          placeholder: 'Repetições',
          min: 1
        },
        {
          name: 'sets',
          type: 'number',
          placeholder: 'Séries',
          min: 1
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Salvar',
          handler: async (data) => {
            if (data.weight && data.reps && data.sets) {
              await this.savePersonalRecord(data);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async savePersonalRecord(data: PersonalRecordData) {
    try {
      const allRecords = await this.storageService.get<PersonalRecord[]>('personalRecords') || [];
      
      const newRecord: PersonalRecord = {
        id: Date.now().toString(),
        exerciseId: this.exerciseId,
        exerciseName: this.exercise?.name,
        weight: parseFloat(data.weight),
        reps: parseInt(data.reps),
        sets: parseInt(data.sets),
        date: new Date(),
        oneRepMax: this.calculateOneRepMax(parseFloat(data.weight), parseInt(data.reps))
      };
      
      allRecords.push(newRecord);
      await this.storageService.set('personalRecords', allRecords);
      
      await this.loadPersonalRecords();
      await this.showToast('Recorde pessoal salvo!');
      
    } catch (error) {
      console.error('Error saving personal record:', error);
      await this.showErrorToast('Erro ao salvar recorde');
    }
  }

  calculateOneRepMax(weight: number, reps: number): number {
    // Brzycki formula: 1RM = weight / (1.0278 - (0.0278 × reps))
    return Math.round(weight / (1.0278 - (0.0278 * reps)));
  }

  async presentActionSheet() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Opções do Exercício',
      buttons: [
        {
          text: this.isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos',
          icon: this.isFavorite ? 'heart-dislike' : 'heart',
          handler: () => {
            this.toggleFavorite();
          }
        },
        {
          text: 'Adicionar Recorde',
          icon: 'trophy',
          handler: () => {
            this.addPersonalRecord();
          }
        },
        {
          text: 'Compartilhar',
          icon: 'share',
          handler: () => {
            this.shareExercise();
          }
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

  async shareExercise() {
    // Simulate sharing functionality
    await this.showToast('Funcionalidade de compartilhamento em desenvolvimento');
  }

  navigateToRelatedExercise(exerciseId: string) {
    // Use navigation service to navigate with parameters
    this.navigationService.navigateToExerciseDetail(exerciseId);
  }

  goBack() {
    this.navigationService.goBack();
  }

  async startWorkout() {
    // Navigate to workout creation with this exercise
    await this.navigationService.navigateToCreateWorkout(this.exerciseId);
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    toast.present();
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'Iniciante': return 'success';
      case 'Intermediário': return 'warning';
      case 'Avançado': return 'danger';
      default: return 'medium';
    }
  }

  getDifficultyIcon(difficulty: string): string {
    switch (difficulty) {
      case 'Iniciante': return 'flower-outline';
      case 'Intermediário': return 'fitness-outline';
      case 'Avançado': return 'flame-outline';
      default: return 'help-outline';
    }
  }

  // Timer methods
  startTimer() {
    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
    }, 1000);
  }

  pauseTimer() {
    this.isTimerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  resetTimer() {
    this.isTimerRunning = false;
    this.timerSeconds = 0;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Video methods

  playVideo() {
    // Simulate video play functionality
    this.showToast('Reproduzindo vídeo do exercício');
  }

  // Workout methods
  async addToWorkout() {
    try {
      const workoutEntry = {
        exerciseId: this.exerciseId,
        exerciseName: this.exercise?.name,
        sets: this.workoutData.sets,
        reps: this.workoutData.reps,
        weight: this.workoutData.weight,
        notes: this.workoutData.notes,
        date: new Date(),
        completed: false
      };

      const currentWorkout = await this.storageService.get<WorkoutEntry[]>('currentWorkout') || [];
      currentWorkout.push(workoutEntry);
      await this.storageService.set('currentWorkout', currentWorkout);

      await this.showToast('Exercício adicionado ao treino!');
    } catch (error) {
      console.error('Error adding to workout:', error);
      await this.showErrorToast('Erro ao adicionar ao treino');
    }
  }

  // Navigation methods
  navigateToExercise(exerciseId: string) {
    this.navigationService.navigateToExerciseDetail(exerciseId);
  }

  // Timer component event handlers
  onTimerUpdate(event: TimerUpdateEvent | number) {
    this.timerSeconds = typeof event === 'number' ? event : (event.detail || 0);
    console.log('Timer updated:', this.timerSeconds);
  }

  onTimerComplete() {
    console.log('Timer completed!');
    this.showToast('Timer finalizado!');
  }

  // Device control methods
  async toggleOrientationLock() {
    try {
      if (this.isOrientationLocked) {
        await this.deviceControlService.unlockOrientation();
        this.isOrientationLocked = false;
        await this.showToast('Orientação desbloqueada');
      } else {
        await this.deviceControlService.lockToPortrait();
        this.isOrientationLocked = true;
        await this.showToast('Orientação bloqueada em retrato');
      }
    } catch (error) {
      console.error('Error toggling orientation:', error);
    }
  }
}
