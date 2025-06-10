import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JsonDataService, ExerciseData } from '../services/json-data.service';
import { ExerciseService, ExerciseLibraryItem } from '../services/exercise.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';
import { DeviceControlService } from '../services/device-control.service';
import { TranslationService } from '../services/translation.service';
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
    private exerciseService: ExerciseService,
    private navigationService: NavigationService,
    private storageService: StorageService,
    private deviceControlService: DeviceControlService,
    private translationService: TranslationService,
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) { }

  async ngOnInit() {
    // Lock orientation for this page
    await this.deviceControlService.lockToPortrait();

    // Get exercise ID from route parameters
    this.route.paramMap.subscribe(params => {
      this.exerciseId = params.get('id') || '';
      console.log('Exercise ID from route:', this.exerciseId);
      if (this.exerciseId) {
        this.loadExerciseData();
        this.checkIfFavorite();
        this.loadUserNotes();
        this.loadPersonalRecords();
      }
    });
  }

  async ngOnDestroy() {
    // Allow orientation changes when leaving
    await this.deviceControlService.allowLandscape();
  }

  async loadExerciseData() {
    try {
      this.loading = true;
      this.isLoading = true;

      console.log('🔍 Buscando exercício com ID:', this.exerciseId);

      // Primeiro, tentar buscar no JsonDataService (exercícios padrão)
      this.exercise = await this.jsonDataService.getExercise(this.exerciseId);

      // Se não encontrar, buscar no ExerciseService (exercícios personalizados)
      if (!this.exercise) {
        console.log('⚠️ Exercício não encontrado no JsonDataService, buscando no ExerciseService...');
        const customExercise = this.exerciseService.getExerciseById(this.exerciseId);

        if (customExercise) {
          console.log('✅ Exercício personalizado encontrado:', customExercise.name);
          // Converter ExerciseLibraryItem para ExerciseData
          this.exercise = this.convertToExerciseData(customExercise);
        }
      } else {
        console.log('✅ Exercício padrão encontrado:', this.exercise.name);
      }

      if (this.exercise) {
        // Load related exercises from same muscle group
        this.relatedExercises = await this.jsonDataService.getExercisesByMuscleGroup(
          this.exercise.muscleGroup
        );

        // Remove current exercise from related
        this.relatedExercises = this.relatedExercises.filter(ex => ex.id !== this.exerciseId);

        console.log('📋 Exercícios relacionados carregados:', this.relatedExercises.length);
      } else {
        console.error('❌ Exercício não encontrado em nenhum service');
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

  // Convert ExerciseLibraryItem to ExerciseData for compatibility
  private convertToExerciseData(item: ExerciseLibraryItem): ExerciseData {
    return {
      id: item.id,
      name: item.name,
      muscleGroup: item.category, // Mapear category para muscleGroup
      equipment: item.equipment.join(', ') || 'Nenhum',
      difficulty: item.difficulty,
      instructions: [item.instructions], // Converter string para array
      primaryMuscles: item.muscleGroups,
      secondaryMuscles: [],
      tips: [],
      imageUrl: item.imageUrl,
      description: item.instructions,
      duration: item.duration?.toString() || '0',
      calories: item.calories || 0,
      muscleGroups: item.muscleGroups,
      commonMistakes: [],
      emoji: item.emoji
    };
  }

  // Métodos para tradução e UI (usando serviço centralizado)
  getDifficultyColor(difficulty: string): string {
    return this.translationService.getDifficultyColor(difficulty);
  }

  getDifficultyIcon(difficulty: string): string {
    return this.translationService.getDifficultyIcon(difficulty);
  }

  getDifficultyLabel(difficulty: string): string {
    return this.translationService.getDifficultyLabel(difficulty);
  }

  // Métodos que estavam faltando baseados nos erros de compilação
  playVideo() {
    // Implementação do reprodutor de vídeo
    console.log('🎥 Reproduzindo vídeo do exercício');
    // Aqui seria implementada a lógica de reprodução de vídeo
    this.showToast('Funcionalidade de vídeo em desenvolvimento');
  }

  onTimerUpdate(event: { seconds: number } | number) {
    const seconds = typeof event === 'number' ? event : event.seconds;
    // Atualizar dados do timer
    this.timerSeconds = seconds;
    console.log('⏰ Timer atualizado:', this.timerSeconds);
  }

  onTimerComplete() {
    // Ações quando o timer termina
    console.log('⏰ Timer finalizado!');
    this.isTimerRunning = false;
    this.showToast('Timer finalizado! 🎉');
  }

  addToWorkout() {
    // Adicionar exercício ao treino
    console.log('💪 Adicionando ao treino:', this.exercise?.name);
    this.showToast(`${this.exercise?.name} adicionado ao treino!`);
  }

  navigateToExercise(exerciseId: string) {
    // Navegar para outro exercício
    console.log('🚀 Navegando para exercício:', exerciseId);
    this.navigationService.navigateToExerciseDetail(exerciseId);
  }

  async toggleOrientationLock() {
    // Alternar bloqueio de orientação
    try {
      if (this.isOrientationLocked) {
        await this.deviceControlService.allowLandscape();
        this.isOrientationLocked = false;
        this.showToast('Orientação desbloqueada');
      } else {
        await this.deviceControlService.lockToPortrait();
        this.isOrientationLocked = true;
        this.showToast('Orientação bloqueada');
      }
    } catch (error) {
      console.error('Erro ao alterar orientação:', error);
      this.showErrorToast('Erro ao alterar orientação');
    }
  }

  translateMuscleGroup(muscleGroup: string): string {
    return this.translationService.getMuscleGroupLabel(muscleGroup);
  }
}
