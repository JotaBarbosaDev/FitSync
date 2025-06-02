import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { JsonDataService, ExerciseData } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';
import { DeviceControlService } from '../services/device-control.service';
import { ExerciseService, ExerciseLibraryItem } from '../services/exercise.service';

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
  
  exercises: ExerciseLibraryItem[] = [];
  filteredExercises: ExerciseLibraryItem[] = [];
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
    private alertController: AlertController,
    private jsonDataService: JsonDataService,
    private navigationService: NavigationService,
    private storageService: StorageService,
    private deviceControlService: DeviceControlService,
    private exerciseService: ExerciseService
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
      this.exerciseService.getExerciseLibrary().subscribe(exercises => {
        this.exercises = exercises;
        this.filteredExercises = exercises;
        this.loading = false;
      });
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
                           (exercise.instructions || '').toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesMuscleGroup = this.selectedMuscleGroup === 'all' || 
                                exercise.category === this.selectedMuscleGroup ||
                                exercise.muscleGroups.includes(this.selectedMuscleGroup);
      
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

  async toggleFavorite(exercise: ExerciseLibraryItem, event: Event) {
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

  openExerciseDetail(exercise: ExerciseLibraryItem) {
    console.log('🚀 Navegando para exercício:', exercise.id, exercise.name);
    this.navigationService.navigateToExerciseDetail(exercise.id);
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedMuscleGroup = 'all';
    this.showFavoritesOnly = false;
    this.filterExercises();
  }

  async createCustomExercise() {
    // Primeiro, mostrar seleção de grupo muscular
    const muscleGroupAlert = await this.alertController.create({
      header: 'Selecionar Grupo Muscular',
      message: 'Escolha o grupo muscular principal:',
      inputs: [
        { name: 'muscleGroup', type: 'radio', label: '💪 Braços', value: 'arms' },
        { name: 'muscleGroup', type: 'radio', label: '🏠 Peito', value: 'chest' },
        { name: 'muscleGroup', type: 'radio', label: '🔙 Costas', value: 'back' },
        { name: 'muscleGroup', type: 'radio', label: '🦵 Pernas', value: 'legs' },
        { name: 'muscleGroup', type: 'radio', label: '🔺 Ombros', value: 'shoulders' },
        { name: 'muscleGroup', type: 'radio', label: '🏋️ Abdômen', value: 'core' },
        { name: 'muscleGroup', type: 'radio', label: '❤️ Cardio', value: 'cardio' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Próximo',
          handler: async (muscleGroupData) => {
            if (muscleGroupData) {
              await this.showEquipmentSelection(muscleGroupData);
            }
            return true;
          }
        }
      ]
    });

    await muscleGroupAlert.present();
  }

  async showEquipmentSelection(muscleGroup: string) {
    const equipmentAlert = await this.alertController.create({
      header: 'Selecionar Equipamento',
      message: 'Escolha o equipamento necessário:',
      inputs: [
        { name: 'equipment', type: 'radio', label: '🏋️ Peso Livre', value: 'peso_livre' },
        { name: 'equipment', type: 'radio', label: '🏭 Máquina', value: 'maquina' },
        { name: 'equipment', type: 'radio', label: '📏 Barra', value: 'barra' },
        { name: 'equipment', type: 'radio', label: '🔩 Halter', value: 'halter' },
        { name: 'equipment', type: 'radio', label: '🤲 Peso Corporal', value: 'peso_corporal' },
        { name: 'equipment', type: 'radio', label: '🏃 Esteira', value: 'esteira' },
        { name: 'equipment', type: 'radio', label: '🚴 Bicicleta', value: 'bicicleta' },
        { name: 'equipment', type: 'radio', label: '⚡ Elíptico', value: 'eliptico' },
        { name: 'equipment', type: 'radio', label: '❌ Nenhum', value: 'nenhum' }
      ],
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        {
          text: 'Próximo',
          handler: async (equipmentData) => {
            if (equipmentData) {
              await this.showExerciseDetailsForm(muscleGroup, equipmentData);
            }
            return true;
          }
        }
      ]
    });

    await equipmentAlert.present();
  }

  async showExerciseDetailsForm(muscleGroup: string, equipment: string) {
    const detailsAlert = await this.alertController.create({
      header: 'Detalhes do Exercício',
      message: `Grupo: ${this.getMuscleGroupName(muscleGroup)} | Equipamento: ${this.getEquipmentName(equipment)}<br><br>Preencha os detalhes do exercício:`,
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nome do exercício *',
          attributes: { maxlength: 50 }
        },
        {
          name: 'duration',
          type: 'number',
          placeholder: 'Duração em minutos *',
          min: 1,
          max: 120,
          value: 30
        },
        {
          name: 'calories',
          type: 'number',
          placeholder: 'Calorias estimadas *',
          min: 10,
          max: 1000,
          value: 100
        },
        {
          name: 'difficulty',
          type: 'radio',
          label: '🟢 Iniciante',
          value: 'beginner',
          checked: true
        },
        {
          name: 'difficulty',
          type: 'radio',
          label: '🟡 Intermediário',
          value: 'intermediate'
        },
        {
          name: 'difficulty',
          type: 'radio',
          label: '🔴 Avançado',
          value: 'advanced'
        },
        {
          name: 'instructions',
          type: 'textarea',
          placeholder: 'Instruções de execução *',
          attributes: { rows: 4, maxlength: 500 }
        }
      ],
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        {
          text: 'Criar Exercício',
          handler: async (data) => {
            if (data.name && data.duration && data.calories && data.instructions && data.difficulty) {
              const exerciseData = {
                ...data,
                muscleGroup,
                equipment
              };
              await this.saveCustomExercise(exerciseData);
              return true;
            } else {
              await this.showToast('Por favor, preencha todos os campos obrigatórios (*)', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await detailsAlert.present();
  }

  private async saveCustomExercise(exerciseData: any) {
    try {
      const emoji = this.getMuscleGroupEmoji(exerciseData.muscleGroup);
      
      const newExercise: Omit<ExerciseLibraryItem, 'id'> = {
        name: exerciseData.name,
        category: this.mapMuscleGroupToCategory(exerciseData.muscleGroup),
        muscleGroups: [exerciseData.muscleGroup],
        equipment: exerciseData.equipment !== 'nenhum' ? [exerciseData.equipment] : [],
        instructions: exerciseData.instructions,
        difficulty: exerciseData.difficulty,
        duration: parseInt(exerciseData.duration),
        calories: parseInt(exerciseData.calories),
        emoji: emoji,
        imageUrl: undefined // Removemos dependência de imagens
      };

      this.exerciseService.addCustomExercise(newExercise).subscribe({
        next: (createdExercise) => {
          this.showToast(`${emoji} Exercício "${exerciseData.name}" criado com sucesso!`, 'success');
          // Recarregar a lista de exercícios
          this.loadExercises();
        },
        error: (error) => {
          console.error('Erro ao criar exercício:', error);
          this.showToast('Erro ao criar exercício', 'danger');
        }
      });
    } catch (error) {
      console.error('Erro ao salvar exercício:', error);
      await this.showToast('Erro ao salvar exercício', 'danger');
    }
  }

  private mapMuscleGroupToCategory(muscleGroup: string): 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' {
    const mapping: { [key: string]: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' } = {
      'chest': 'chest',
      'peito': 'chest',
      'back': 'back',
      'costas': 'back',
      'legs': 'legs',
      'pernas': 'legs',
      'shoulders': 'shoulders',
      'ombros': 'shoulders',
      'arms': 'arms',
      'braços': 'arms',
      'core': 'core',
      'abdomen': 'core',
      'cardio': 'cardio'
    };
    
    return mapping[muscleGroup.toLowerCase()] || 'core';
  }

  async startQuickWorkout() {
    await this.deviceControlService.lockOrientation('portrait');
    this.navigationService.navigateToQuickWorkout();
  }

  // Filter and Sort Functions
  async showFilterOptions() {
    // Implementation for filter options modal/popover
    console.log('Show filter options');
    await this.showToast('Opções de filtro em desenvolvimento', 'primary');
  }

  async showSortOptions() {
    // Implementation for sort options modal/popover
    console.log('Show sort options');
    await this.showToast('Opções de ordenação em desenvolvimento', 'primary');
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

  trackByExerciseId(index: number, exercise: ExerciseLibraryItem): string {
    return exercise.id;
  }

  // Função auxiliar para mapear grupo muscular para emoji
  private getMuscleGroupEmoji(muscleGroup: string): string {
    const emojiMapping: { [key: string]: string } = {
      'arms': '💪',
      'chest': '🏠', 
      'back': '🔙',
      'legs': '🦵',
      'shoulders': '🔺',
      'core': '🏋️',
      'cardio': '❤️'
    };
    return emojiMapping[muscleGroup] || '💪';
  }

  // Função auxiliar para obter nome legível do equipamento
  private getEquipmentName(equipment: string): string {
    const equipmentMapping: { [key: string]: string } = {
      'peso_livre': 'Peso Livre',
      'maquina': 'Máquina', 
      'barra': 'Barra',
      'halter': 'Halter',
      'peso_corporal': 'Peso Corporal',
      'esteira': 'Esteira',
      'bicicleta': 'Bicicleta',
      'eliptico': 'Elíptico',
      'nenhum': 'Nenhum'
    };
    return equipmentMapping[equipment] || equipment;
  }

  convertToExerciseData(item: ExerciseLibraryItem): ExerciseData {
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
}
