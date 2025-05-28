import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';
import { JsonDataService } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { DeviceControlService } from '../services/device-control.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  nomeInstituto: string;
  userProfile: any = {};
  recentWorkouts: any[] = [];
  featuredExercises: any[] = [];
  todayStats = {
    workouts: 0,
    calories: 0,
    time: 0
  };
  isLoading = true;

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
      // Load user profile
      this.userProfile = await this.storageService.getUserProfile() || {
        name: 'Usuário FitSync',
        level: 'Iniciante',
        streak: 0
      };

      // Load recent workouts
      this.recentWorkouts = await this.storageService.getWorkouts() || [];
      this.recentWorkouts = this.recentWorkouts.slice(0, 3); // Last 3 workouts
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async loadFeaturedExercises() {
    try {
      const fitnessData = await this.jsonDataService.getFitnessData();
      if (fitnessData && fitnessData.exercises) {
        this.featuredExercises = fitnessData.exercises.slice(0, 4); // Featured exercises
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
              const notes = await this.storageService.get('quick-notes') || [];
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
}


