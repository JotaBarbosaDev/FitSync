import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { JsonDataService, ExerciseData } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';
import { DeviceControlService } from '../services/device-control.service';

interface WorkoutSet {
  reps: number | null;
  weight: number | null;
  rpe: number | null; // Rate of Perceived Exertion (1-10)
  completed: boolean;
}

interface ExerciseHistory {
  date: Date;
  sets: WorkoutSet[];
  totalVolume: number;
  notes?: string;
}

interface RestTimer {
  timeLeft: number;
  running: boolean;
  interval?: any;
}

interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: "app-detalhe",
  templateUrl: "./detalhe.page.html",
  styleUrls: ["./detalhe.page.scss"],
  standalone: false,
})
export class DetalhePage implements OnInit, OnDestroy {
  exercise: ExerciseData | null = null;
  exerciseId: string = '';
  relatedExercises: ExerciseData[] = [];
  workoutSets: WorkoutSet[] = [{ reps: null, weight: null, rpe: null, completed: false }];
  exerciseHistory: ExerciseHistory[] = [];
  restTimers: { [key: number]: RestTimer } = {};
  loading: boolean = true;
  isFavorite: boolean = false;
  
  // Timer properties
  currentTime: number = 0;
  isTimerRunning: boolean = false;
  timerState: 'exercise' | 'rest' = 'exercise';
  timerInterval: any;
  exerciseTime: number = 45; // seconds
  restTime: number = 30; // seconds

  muscleGroups: MuscleGroup[] = [
    { id: 'chest', name: 'Peito', icon: 'body-outline', color: 'danger' },
    { id: 'back', name: 'Costas', icon: 'person-outline', color: 'success' },
    { id: 'legs', name: 'Pernas', icon: 'walk-outline', color: 'warning' },
    { id: 'arms', name: 'Braços', icon: 'barbell-outline', color: 'secondary' },
    { id: 'shoulders', name: 'Ombros', icon: 'arrow-up-outline', color: 'tertiary' },
    { id: 'core', name: 'Abdômen', icon: 'diamond-outline', color: 'medium' }
  ];

  constructor(
    private route: ActivatedRoute,
    private toastController: ToastController,
    private alertController: AlertController,
    private jsonDataService: JsonDataService,
    private navigationService: NavigationService,
    private storageService: StorageService,
    private deviceControlService: DeviceControlService
  ) { }

  async ngOnInit() {
    // Lock orientation for exercise detail
    await this.deviceControlService.lockToPortrait();
    
    // Get exercise ID from query params
    this.route.queryParams.subscribe(params => {
      if (params['exerciseId']) {
        this.exerciseId = params['exerciseId'];
        this.loadExercise();
      }
    });
  }

  async ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    // Allow orientation changes when leaving
    await this.deviceControlService.allowLandscape();
  }

  async loadExercise() {
    try {
      this.loading = true;
      
      // Load exercise data from JSON service
      this.exercise = await this.jsonDataService.getExercise(this.exerciseId);
      
      if (this.exercise) {
        await this.loadRelatedExercises();
        await this.checkIfFavorite();
        await this.loadExerciseHistory();
      }
      
    } catch (error) {
      console.error('Error loading exercise:', error);
      await this.showToast('Erro ao carregar exercício', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async loadRelatedExercises() {
    try {
      if (this.exercise) {
        this.relatedExercises = await this.jsonDataService.getExercisesByMuscleGroup(
          this.exercise.muscleGroup
        );
        // Remove current exercise from related
        this.relatedExercises = this.relatedExercises.filter(ex => ex.id !== this.exerciseId);
      }
    } catch (error) {
      console.error('Error loading related exercises:', error);
    }
  }

  async checkIfFavorite() {
    try {
      const favorites = await this.storageService.get('favoriteExercises') || [];
      this.isFavorite = favorites.includes(this.exerciseId);
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  }

  async loadExerciseHistory() {
    try {
      const history = await this.storageService.get('exerciseHistory') || [];
      this.exerciseHistory = history.filter((h: any) => h.exerciseId === this.exerciseId);
    } catch (error) {
      console.error('Error loading exercise history:', error);
    }
  }

  getMuscleGroupName(groupId: string): string {
    const group = this.muscleGroups.find(g => g.id === groupId);
    return group ? group.name : groupId;
  }

  async toggleFavorite() {
    try {
      let favorites = await this.storageService.get('favoriteExercises') || [];
      
      if (this.isFavorite) {
        favorites = favorites.filter((id: string) => id !== this.exerciseId);
        this.isFavorite = false;
        await this.showToast('Removido dos favoritos');
      } else {
        favorites.push(this.exerciseId);
        this.isFavorite = true;
        await this.showToast('Adicionado aos favoritos');
      }
      
      await this.storageService.set('favoriteExercises', favorites);
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      await this.showToast('Erro ao atualizar favoritos', 'danger');
    }
  }

  async shareExercise() {
    // Simulate sharing functionality
    await this.showToast('Funcionalidade de compartilhamento em desenvolvimento');
  }

  // Timer methods
  startTimer() {
    if (!this.isTimerRunning) {
      this.isTimerRunning = true;
      this.timerInterval = setInterval(() => {
        if (this.timerState === 'exercise') {
          this.currentTime++;
          if (this.currentTime >= this.exerciseTime) {
            this.switchTimerState();
          }
        } else {
          this.currentTime--;
          if (this.currentTime <= 0) {
            this.switchTimerState();
          }
        }
      }, 1000);
    }
  }

  pauseTimer() {
    this.isTimerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  resetTimer() {
    this.isTimerRunning = false;
    this.currentTime = 0;
    this.timerState = 'exercise';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  switchTimerState() {
    if (this.timerState === 'exercise') {
      this.timerState = 'rest';
      this.currentTime = this.restTime;
      this.showToast('Tempo de descanso!', 'warning');
    } else {
      this.timerState = 'exercise';
      this.currentTime = 0;
      this.showToast('Próxima série!', 'success');
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Workout tracking methods
  addSet() {
    this.workoutSets.push({ reps: null, weight: null, rpe: null, completed: false });
  }

  removeSet(index: number) {
    if (this.workoutSets.length > 1) {
      this.workoutSets.splice(index, 1);
    }
  }

  onSetCompleted(index: number) {
    const set = this.workoutSets[index];
    if (set.completed && set.reps && set.weight) {
      this.startRestTimer(index);
    }
  }

  startRestTimer(setIndex: number) {
    const restTime = 60; // 60 seconds default
    this.restTimers[setIndex] = {
      timeLeft: restTime,
      running: true,
      interval: setInterval(() => {
        this.restTimers[setIndex].timeLeft--;
        if (this.restTimers[setIndex].timeLeft <= 0) {
          this.restTimers[setIndex].running = false;
          clearInterval(this.restTimers[setIndex].interval);
          this.showToast('Tempo de descanso finalizado!', 'success');
        }
      }, 1000)
    };
  }

  async saveWorkout() {
    try {
      const completedSets = this.workoutSets.filter(set => set.completed);
      
      if (completedSets.length === 0) {
        await this.showToast('Complete pelo menos uma série', 'warning');
        return;
      }

      const workoutData = {
        exerciseId: this.exerciseId,
        exerciseName: this.exercise?.name,
        date: new Date(),
        sets: completedSets,
        totalVolume: this.getTotalVolume(),
        notes: ''
      };

      // Save to exercise history
      const history = await this.storageService.get('exerciseHistory') || [];
      history.push(workoutData);
      await this.storageService.set('exerciseHistory', history);

      // Save to user progress
      await this.updateUserProgress(workoutData);

      await this.showToast('Treino salvo com sucesso!', 'success');
      this.resetWorkout();
      
    } catch (error) {
      console.error('Error saving workout:', error);
      await this.showToast('Erro ao salvar treino', 'danger');
    }
  }

  async updateUserProgress(workoutData: any) {
    try {
      const progress = await this.storageService.get('userProgress') || {};
      const today = new Date().toDateString();
      
      if (!progress[today]) {
        progress[today] = {
          exercises: [],
          totalVolume: 0,
          totalSets: 0,
          calories: 0
        };
      }
      
      progress[today].exercises.push(workoutData);
      progress[today].totalVolume += workoutData.totalVolume;
      progress[today].totalSets += workoutData.sets.length;
      progress[today].calories += this.exercise?.calories || 0;
      
      await this.storageService.set('userProgress', progress);
      
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  resetWorkout() {
    this.workoutSets = [{ reps: null, weight: null, rpe: null, completed: false }];
    Object.keys(this.restTimers).forEach(key => {
      if (this.restTimers[parseInt(key)].interval) {
        clearInterval(this.restTimers[parseInt(key)].interval);
      }
    });
    this.restTimers = {};
  }

  // Helper methods
  getCompletedSets(): number {
    return this.workoutSets.filter(set => set.completed).length;
  }

  getTotalReps(): number {
    return this.workoutSets
      .filter(set => set.completed && set.reps)
      .reduce((total, set) => total + (set.reps || 0), 0);
  }

  getTotalVolume(): number {
    return this.workoutSets
      .filter(set => set.completed && set.reps && set.weight)
      .reduce((total, set) => total + ((set.reps || 0) * (set.weight || 0)), 0);
  }

  getAverageRPE(): number {
    const completedSets = this.workoutSets.filter(set => set.completed && set.rpe);
    if (completedSets.length === 0) return 0;
    
    const totalRPE = completedSets.reduce((total, set) => total + (set.rpe || 0), 0);
    return Math.round(totalRPE / completedSets.length * 10) / 10;
  }

  hasCompletedSets(): boolean {
    return this.workoutSets.some(set => set.completed);
  }

  getRecommendedWeight(): number {
    // Simple logic for weight recommendation based on history
    if (this.exerciseHistory.length > 0) {
      const lastWorkout = this.exerciseHistory[this.exerciseHistory.length - 1];
      const maxWeight = Math.max(...lastWorkout.sets.map(set => set.weight || 0));
      return maxWeight * 1.05; // 5% increase
    }
    return 0;
  }

  getRecommendedReps(): string {
    return '8-12'; // Default recommendation
  }

  getLastWorkoutDate(): string {
    if (this.exerciseHistory.length > 0) {
      return this.exerciseHistory[this.exerciseHistory.length - 1].date.toLocaleDateString();
    }
    return 'Nunca';
  }

  getBestSet(): string {
    let bestVolume = 0;
    let bestSet = '';
    
    this.exerciseHistory.forEach(workout => {
      workout.sets.forEach(set => {
        const volume = (set.reps || 0) * (set.weight || 0);
        if (volume > bestVolume) {
          bestVolume = volume;
          bestSet = `${set.weight}kg x ${set.reps}`;
        }
      });
    });
    
    return bestSet || 'Nenhum';
  }

  getRestTimeForSet(setIndex: number): number {
    // Return rest time in seconds based on set index
    const baseRestTime = this.exercise?.difficulty === 'advanced' ? 180 : 60;
    return baseRestTime;
  }

  openRelatedExercise(exercise: ExerciseData) {
    this.navigationService.navigateToExerciseDetail(exercise.id);
  }

  goBack() {
    this.navigationService.goBack();
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
}
