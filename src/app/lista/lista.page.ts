import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { JsonDataService, ExerciseData } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';
import { DeviceControlService } from '../services/device-control.service';

interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-lista',
  templateUrl: './lista.page.html',
  styleUrls: ['./lista.page.scss'],
  standalone: false
})
export class ListaPage implements OnInit {
  searchQuery: string = '';
  selectedMuscleGroup: string = 'all';
  showFavoritesOnly: boolean = false;
  loading: boolean = true;
  
  exercises: ExerciseData[] = [];
  filteredExercises: ExerciseData[] = [];
  favoriteExercises: string[] = [];

  muscleGroups: MuscleGroup[] = [
    { id: 'all', name: 'Todos', icon: 'apps-outline', color: 'primary' },
    { id: 'chest', name: 'Peito', icon: 'body-outline', color: 'danger' },
    { id: 'back', name: 'Costas', icon: 'person-outline', color: 'success' },
    { id: 'legs', name: 'Pernas', icon: 'walk-outline', color: 'warning' },
    { id: 'arms', name: 'Braços', icon: 'barbell-outline', color: 'secondary' },
    { id: 'shoulders', name: 'Ombros', icon: 'arrow-up-outline', color: 'tertiary' },
    { id: 'core', name: 'Abdômen', icon: 'diamond-outline', color: 'medium' }
  ];

  constructor(
    private router: Router,
    private toastController: ToastController,
    private jsonDataService: JsonDataService,
    private navigationService: NavigationService,
    private storageService: StorageService,
    private deviceControlService: DeviceControlService
  ) { }

  async ngOnInit() {
    await this.deviceControlService.lockToPortrait();
    await this.loadExercises();
    await this.loadFavorites();
    this.filterExercises();
    this.loading = false;
  }

  async loadExercises() {
    try {
      const fitnessData = await this.jsonDataService.getFitnessData();
      if (fitnessData?.exercises) {
        this.exercises = fitnessData.exercises;
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      await this.showToast('Erro ao carregar exercícios', 'danger');
    }
  }

  async loadFavorites() {
    try {
      this.favoriteExercises = await this.storageService.get<string[]>('favoriteExercises') || [];
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  filterExercises() {
    this.filteredExercises = this.exercises.filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                           (exercise.description || '').toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesMuscleGroup = this.selectedMuscleGroup === 'all' || 
                                exercise.muscleGroup === this.selectedMuscleGroup;
      
      const matchesFavorites = !this.showFavoritesOnly || this.isFavorite(exercise.id);
      
      return matchesSearch && matchesMuscleGroup && matchesFavorites;
    });
  }

  filterByMuscleGroup(groupId: string) {
    this.selectedMuscleGroup = groupId;
    this.filterExercises();
  }

  toggleFavorites() {
    this.showFavoritesOnly = !this.showFavoritesOnly;
    this.filterExercises();
  }

  async toggleFavorite(exercise: ExerciseData, event: Event) {
    event.stopPropagation();
    
    try {
      let favorites = await this.storageService.get<string[]>('favoriteExercises') || [];
      
      if (this.isFavorite(exercise.id)) {
        favorites = favorites.filter((id: string) => id !== exercise.id);
        await this.showToast(`${exercise.name} removido dos favoritos`, 'medium');
      } else {
        favorites.push(exercise.id);
        await this.showToast(`${exercise.name} adicionado aos favoritos`, 'success');
      }
      
      await this.storageService.set('favoriteExercises', favorites);
      this.favoriteExercises = favorites;
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      await this.showToast('Erro ao atualizar favoritos', 'danger');
    }
  }

  isFavorite(exerciseId: string): boolean {
    return this.favoriteExercises.includes(exerciseId);
  }

  getMuscleGroupName(groupId: string): string {
    const group = this.muscleGroups.find(g => g.id === groupId);
    return group ? group.name : groupId;
  }

  openExerciseDetail(exercise: ExerciseData) {
    this.navigationService.navigateToExerciseDetail(exercise.id);
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedMuscleGroup = 'all';
    this.showFavoritesOnly = false;
    this.filterExercises();
  }

  createCustomExercise() {
    this.navigationService.navigateToWorkoutCreator();
  }

  async startQuickWorkout() {
    await this.deviceControlService.lockOrientation('portrait');
    this.navigationService.navigateToQuickWorkout();
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

  trackByExerciseId(index: number, exercise: ExerciseData): string {
    return exercise.id;
  }
}
