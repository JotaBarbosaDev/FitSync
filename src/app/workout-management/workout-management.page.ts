import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { ModalController, ToastController } from '@ionic/angular';
import { ExerciseLibraryItem, ExerciseService } from '../services/exercise.service';
import { ExerciseSelectionModalComponent } from './exercise-selection-modal.component';
import { Subscription } from 'rxjs';

interface WeekDay {
  name: string;
  shortName: string;
  isToday: boolean;
}

interface SelectableExercise extends ExerciseLibraryItem {
  selected?: boolean;
}

@Component({
  selector: 'app-workout-management',
  templateUrl: './workout-management.page.html',
  styleUrls: ['./workout-management.page.scss'],
  standalone: false
})
export class WorkoutManagementPage implements OnInit, OnDestroy {
  isLoading = true;
  weekDays: WeekDay[] = [];
  weeklyExercises: ExerciseLibraryItem[][] = [];
  availableExercises: SelectableExercise[] = [];

  private exerciseSubscription?: Subscription;

  constructor(
    private router: Router,
    private storage: Storage,
    private modalController: ModalController,
    private toastController: ToastController,
    private exerciseService: ExerciseService
  ) {
    this.initializeWeekDays();
  }

  async ngOnInit() {
    await this.storage.create();
    await this.loadWeeklyPlan();
    await this.loadAvailableExercises();
    this.isLoading = false;
  }

  private initializeWeekDays() {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = [
      { name: 'Domingo', shortName: 'DOM' },
      { name: 'Segunda-feira', shortName: 'SEG' },
      { name: 'Terça-feira', shortName: 'TER' },
      { name: 'Quarta-feira', shortName: 'QUA' },
      { name: 'Quinta-feira', shortName: 'QUI' },
      { name: 'Sexta-feira', shortName: 'SEX' },
      { name: 'Sábado', shortName: 'SAB' }
    ];

    this.weekDays = dayNames.map((day, index) => ({
      ...day,
      isToday: index === today
    }));
  }

  private async loadWeeklyPlan() {
    // Initialize empty arrays for each day if not exists
    this.weeklyExercises = [];
    for (let i = 0; i < 7; i++) {
      const dayKey = `weekly_exercises_day_${i}`;
      const exercises = await this.storage.get(dayKey) || [];
      this.weeklyExercises[i] = exercises;
    }
  }

  private async loadAvailableExercises() {
    // Unsubscribe from previous subscription if it exists
    if (this.exerciseSubscription) {
      this.exerciseSubscription.unsubscribe();
    }

    this.exerciseSubscription = this.exerciseService.getExerciseLibrary().subscribe(exercises => {
      // Store the original exercises without modifying them
      this.availableExercises = exercises.map(exercise => ({ ...exercise }));
    });
  }

  getExercisesCount(dayIndex: number): number {
    return this.weeklyExercises[dayIndex]?.length || 0;
  }

  getActiveDaysCount(): number {
    return this.weeklyExercises.filter(exercises => exercises && exercises.length > 0).length;
  }

  getPreviewExercises(dayIndex: number): ExerciseLibraryItem[] {
    return this.weeklyExercises[dayIndex]?.slice(0, 3) || [];
  }

  async openDayExercises(dayIndex: number) {
    // Create a clean copy of available exercises to avoid reference issues
    const availableExercisesCopy = this.availableExercises.map(exercise => ({
      ...exercise,
      selected: false // Reset selection state
    }));

    const modal = await this.modalController.create({
      component: ExerciseSelectionModalComponent,
      componentProps: {
        availableExercises: availableExercisesCopy,
        selectedExercises: this.weeklyExercises[dayIndex] || [],
        dayName: this.weekDays[dayIndex].name
      }
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data && result.data.exercises !== undefined) {
        // Create clean copies without the selected property to avoid state pollution
        const cleanExercises = result.data.exercises.map((exercise: any) => {
          const { selected, ...cleanExercise } = exercise;
          return cleanExercise;
        });

        // Save the selected exercises for this day
        this.weeklyExercises[dayIndex] = cleanExercises;
        const dayKey = `weekly_exercises_day_${dayIndex}`;
        await this.storage.set(dayKey, cleanExercises);

        // Show appropriate success toast
        let message: string;
        if (result.data.isRestDay) {
          message = `${this.weekDays[dayIndex].name} configurado como dia de descanso`;
        } else if (cleanExercises.length === 0) {
          message = `Exercícios removidos de ${this.weekDays[dayIndex].name}`;
        } else {
          message = `Exercícios atualizados para ${this.weekDays[dayIndex].name}`;
        }

        const toast = await this.toastController.create({
          message: message,
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }
    });

    return await modal.present();
  }

  async startWorkout(dayIndex: number) {
    const exercises = this.weeklyExercises[dayIndex];
    if (!exercises || exercises.length === 0) {
      const toast = await this.toastController.create({
        message: 'Adicione exercícios a este dia antes de iniciar o treino',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    

    // Navigate to workout execution with the day's exercises
    this.router.navigate(['/tabs/workout-execution'], {
      queryParams: {
        exercises: JSON.stringify(exercises),
        dayName: this.weekDays[dayIndex].name
      }
    });
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.exerciseSubscription) {
      this.exerciseSubscription.unsubscribe();
    }
  }
}


