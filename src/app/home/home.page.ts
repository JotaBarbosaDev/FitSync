import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { JsonDataService } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { DeviceControlService } from '../services/device-control.service';
import { AlertController, ToastController } from '@ionic/angular';

// Interfaces locais para o HomePage
interface UserProfile {
  name: string;
  level: string;
  streak: number;
}

interface WorkoutHistory {
  id: string;
  name: string;
  date: string;
  duration: number;
  caloriesBurned: number;
  completed: boolean;
}

interface QuickNote {
  id: number;
  text: string;
  date: string;
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  imageUrl?: string;
  duration?: string;
  muscleGroups?: string[];
}

interface ActivePlan {
  id: string;
  name: string;
  description: string;
  progress: number;
  totalWorkouts: number;
  completedWorkouts: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  nomeInstituto: string;
  userProfile: UserProfile = {
    name: 'Usuário FitSync',
    level: 'Iniciante',
    streak: 0
  };
  recentWorkouts: WorkoutHistory[] = [];
  featuredExercises: Exercise[] = [];
  activePlan: ActivePlan | null = null;

  todayStats = {
    workouts: 0,
    calories: 0,
    time: 0
  };
  isLoading = true;

  // Array de dicas diárias
  private dailyTips = [
    'Mantenha-se hidratado durante o treino!',
    'O descanso é tão importante quanto o exercício.',
    'Aqueça sempre antes de começar os exercícios.',
    'Mantenha uma alimentação equilibrada.',
    'Ouça seu corpo e respeite seus limites.',
    'A consistência é a chave para o sucesso.',
    'Varie seus exercícios para evitar o tédio.',
    'Durma pelo menos 7-8 horas por noite.'
  ];

  constructor(
    private router: Router,
    private storageService: StorageService,
    private jsonDataService: JsonDataService,
    private navigationService: NavigationService,
    private deviceControlService: DeviceControlService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    this.nomeInstituto = 'Instituto Politécnico de Viana do Castelo';
  }

  async ngOnInit() {
    await this.loadUserData();
    await this.loadFeaturedExercises();
    await this.loadTodayStats();
    this.isLoading = false;
  }

  async loadUserData() {
    try {
      // Load user profile - converter do storage UserProfile para interface local
      const storageProfile = await this.storageService.getUserProfile();
      if (storageProfile) {
        this.userProfile = {
          name: storageProfile.name,
          level: 'Iniciante', // Valor padrão baseado no fitnessGoal ou calculado
          streak: 0 // Seria calculado baseado no histórico
        };
      } else {
        this.userProfile = {
          name: 'Usuário FitSync',
          level: 'Iniciante',
          streak: 0
        };
      }

      // Load recent workouts - converter WorkoutData[] para WorkoutHistory[]
      const workoutData = await this.storageService.getWorkouts() || [];
      this.recentWorkouts = workoutData.map(workout => ({
        id: workout.id,
        name: workout.name,
        date: workout.date instanceof Date ? workout.date.toISOString() : String(workout.date),
        duration: workout.duration,
        caloriesBurned: workout.calories || 0,
        completed: true // WorkoutData salvo assume que foi completado
      })).slice(0, 3); // Last 3 workouts
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async loadFeaturedExercises() {
    try {
      const fitnessData = await this.jsonDataService.getFitnessData();
      if (fitnessData && fitnessData.exercises) {
        // Converter ExerciseData[] para Exercise[]
        this.featuredExercises = fitnessData.exercises
          .slice(0, 4)
          .map(exercise => ({
            id: exercise.id,
            name: exercise.name,
            description: exercise.description || exercise.instructions?.[0] || 'Exercício de fitness',
            difficulty: exercise.difficulty,
            imageUrl: exercise.imageUrl,
            duration: exercise.duration,
            muscleGroups: exercise.muscleGroups
          }));
      }
    } catch (error) {
      console.error('Error loading featured exercises:', error);
    }
  }

  async loadTodayStats() {
    try {
      const workouts = await this.storageService.getWorkouts() || [];
      const today = new Date().toDateString();
      
      const todayWorkouts = workouts.filter(workout => 
        new Date(workout.date).toDateString() === today
      );

      this.todayStats = {
        workouts: todayWorkouts.length,
        calories: todayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0),
        time: todayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
      };
    } catch (error) {
      console.error('Error loading today stats:', error);
    }
  }

  // Navigation methods using NavigationService
  public verDetalhe() {
    this.navigationService.navigateToExerciseDetail('123');
  }

  public navigateToExercisesList() {
    this.navigationService.navigateToExercisesList();
  }

  public navigateToWorkouts() {
    this.navigationService.navigateToWorkoutPlans();
  }

  public navigateToProgress() {
    this.navigationService.navigateToProgress();
  }

  public navigateToProfile() {
    this.navigationService.navigateToProfile();
  }

  // Quick actions
  public async startQuickWorkout() {
    await this.deviceControlService.lockOrientation('portrait');
    this.navigationService.navigateToQuickWorkout();
  }

  public navigateToExercise(exerciseId: string) {
    this.navigationService.navigateToExerciseDetail(exerciseId);
  }

  public async createCustomWorkout() {
    const alert = await this.alertController.create({
      header: 'Criar Treino Personalizado',
      message: 'Você quer criar um novo treino personalizado?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Criar',
          handler: () => {
            this.navigationService.navigateToCreateWorkout();
          }
        }
      ]
    });

    await alert.present();
  }

  // Device control functions
  public async toggleOrientationLock() {
    try {
      await this.deviceControlService.toggleOrientationLock();
      const toast = await this.toastController.create({
        message: 'Orientação da tela alternada',
        duration: 2000,
        position: 'bottom'
      });
      await toast.present();
    } catch (error) {
      console.error('Error toggling orientation:', error);
    }
  }

  // Storage operations
  public async saveQuickNote() {
    const alert = await this.alertController.create({
      header: 'Nota Rápida',
      inputs: [
        {
          name: 'note',
          type: 'textarea',
          placeholder: 'Digite sua nota...'
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
            if (data.note) {
              const notes = await this.storageService.get<QuickNote[]>('quick-notes') || [];
              notes.push({
                id: Date.now(),
                text: data.note,
                date: new Date().toISOString()
              });
              await this.storageService.set('quick-notes', notes);
              
              const toast = await this.toastController.create({
                message: 'Nota salva com sucesso!',
                duration: 2000,
                position: 'bottom'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Utility methods
  public formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  }

  public getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  public getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'fácil':
      case 'easy':
        return 'success';
      case 'médio':
      case 'medium':
        return 'warning';
      case 'difícil':
      case 'hard':
        return 'danger';
      default:
        return 'medium';
    }
  }

  // Métodos chamados no template HTML
  getPlanProgress(): number {
    if (!this.activePlan) return 0;
    if (this.activePlan.totalWorkouts === 0) return 0;
    return Math.round((this.activePlan.completedWorkouts / this.activePlan.totalWorkouts) * 100);
  }

  startWorkout(): void {
    // Navegar para iniciar um treino
    this.navigationService.navigateToQuickWorkout();
  }

  getDailyTip(): string {
    // Retornar uma dica baseada no dia atual
    const dayIndex = new Date().getDay();
    return this.dailyTips[dayIndex] || this.dailyTips[0];
  }
}


