import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { JsonDataService, ExerciseData } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';
import { DeviceControlService } from '../services/device-control.service';
import { ExerciseService, ExerciseLibraryItem } from '../services/exercise.service';
import { TranslationService } from '../services/translation.service';
import { Subscription } from 'rxjs';

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
export class ListaPage implements OnInit, OnDestroy {
  searchQuery: string = '';
  selectedMuscleGroup: string = 'all';
  showFavoritesOnly: boolean = false;
  loading: boolean = true;

  exercises: ExerciseLibraryItem[] = [];
  filteredExercises: ExerciseLibraryItem[] = [];
  favoriteExercises: string[] = [];

  private exerciseSubscription?: Subscription;

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
    private exerciseService: ExerciseService,
    private translationService: TranslationService
  ) { }

  async ngOnInit() {
    await this.deviceControlService.lockToPortrait();
    await this.loadExercises();
    await this.loadFavorites();
    this.filterExercises();
    this.loading = false;
  }

  ngOnDestroy() {
    this.exerciseSubscription?.unsubscribe();
  }

  async onRefresh(event: any) {
    try {
      await this.loadExercises();
      await this.loadFavorites();
    } catch (error) {
      console.error('Erro ao atualizar lista de exercícios:', error);
    } finally {
      event.target.complete();
    }
  }

  async loadExercises() {
    try {
      // Cancelar subscription anterior para evitar duplicatas
      if (this.exerciseSubscription) {
        this.exerciseSubscription.unsubscribe();
        this.exerciseSubscription = undefined;
      }

      // Criar nova subscription
      this.exerciseSubscription = this.exerciseService.getExerciseLibrary().subscribe(exercises => {
        console.log('ListaPage: Recebidos', exercises.length, 'exercícios');
        
        // Remover duplicatas adicionais baseadas no ID
        const uniqueExercises = exercises.filter((exercise, index, self) => 
          index === self.findIndex(ex => ex.id === exercise.id)
        );
        
        if (uniqueExercises.length !== exercises.length) {
          console.log('ListaPage: Removidas', exercises.length - uniqueExercises.length, 'duplicatas locais');
        }
        
        this.exercises = uniqueExercises;
        this.filterExercises();
        this.loading = false;
      });
    } catch (error) {
      console.error('Error loading exercises:', error);
      await this.showToast('Erro ao carregar exercícios', 'danger');
      this.loading = false;
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
    // Garantir que não há duplicatas no array de exercícios antes de filtrar
    const uniqueExercises = this.exercises.filter((exercise, index, self) => 
      index === self.findIndex(ex => ex.id === exercise.id)
    );
    
    this.filteredExercises = uniqueExercises.filter(exercise => {
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

  // Métodos de dificuldade usando TranslationService
  getDifficultyLabel(difficulty: string): string {
    return this.translationService.getDifficultyLabel(difficulty);
  }

  getDifficultyColor(difficulty: string): string {
    return this.translationService.getDifficultyColor(difficulty);
  }

  getDifficultyIcon(difficulty: string): string {
    return this.translationService.getDifficultyIcon(difficulty);
  }

  getMuscleGroupLabel(muscleGroup: string): string {
    return this.translationService.getMuscleGroupLabel(muscleGroup);
  }

  openExerciseDetail(exercise: ExerciseLibraryItem) {
    console.log('🚀 Navegando para exercício:', exercise.id, exercise.name);
    this.navigationService.navigateToExerciseDetail(exercise.id);
  }

  // Verificar se um exercício é personalizado (criado pelo usuário)
  isCustomExercise(exerciseId: string): boolean {
    // Exercícios personalizados têm IDs que começam com 'custom_' ou são UUIDs gerados
    return exerciseId.startsWith('custom_') || exerciseId.length > 10;
  }

  // Editar exercício personalizado
  async editCustomExercise(exercise: ExerciseLibraryItem) {
    if (!this.isCustomExercise(exercise.id)) {
      await this.showToast('Somente exercícios personalizados podem ser editados', 'warning');
      return;
    }

    // Primeiro, mostrar seleção de grupo muscular
    const muscleGroupAlert = await this.alertController.create({
      header: 'Editar Grupo Muscular',
      message: 'Escolha o grupo muscular principal:',
      inputs: [
        { name: 'muscleGroup', type: 'radio', label: '💪 Braços', value: 'arms', checked: exercise.muscleGroups.includes('arms') },
        { name: 'muscleGroup', type: 'radio', label: '🏠 Peito', value: 'chest', checked: exercise.muscleGroups.includes('chest') },
        { name: 'muscleGroup', type: 'radio', label: '🔙 Costas', value: 'back', checked: exercise.muscleGroups.includes('back') },
        { name: 'muscleGroup', type: 'radio', label: '🦵 Pernas', value: 'legs', checked: exercise.muscleGroups.includes('legs') },
        { name: 'muscleGroup', type: 'radio', label: '🔺 Ombros', value: 'shoulders', checked: exercise.muscleGroups.includes('shoulders') },
        { name: 'muscleGroup', type: 'radio', label: '🏋️ Abdômen', value: 'core', checked: exercise.muscleGroups.includes('core') },
        { name: 'muscleGroup', type: 'radio', label: '❤️ Cardio', value: 'cardio', checked: exercise.muscleGroups.includes('cardio') }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Próximo',
          handler: async (muscleGroupData) => {
            if (muscleGroupData) {
              await this.showEditEquipmentSelection(exercise, muscleGroupData);
            }
            return true;
          }
        }
      ]
    });

    await muscleGroupAlert.present();
  }

  async showEditEquipmentSelection(exercise: ExerciseLibraryItem, muscleGroup: string) {
    const currentEquipment = exercise.equipment[0] || 'nenhum';

    const equipmentAlert = await this.alertController.create({
      header: 'Editar Equipamento',
      message: 'Escolha o equipamento necessário:',
      inputs: [
        { name: 'equipment', type: 'radio', label: '🏋️ Peso Livre', value: 'peso_livre', checked: currentEquipment === 'peso_livre' },
        { name: 'equipment', type: 'radio', label: '🏭 Máquina', value: 'maquina', checked: currentEquipment === 'maquina' },
        { name: 'equipment', type: 'radio', label: '📏 Barra', value: 'barra', checked: currentEquipment === 'barra' },
        { name: 'equipment', type: 'radio', label: '🔩 Halter', value: 'halter', checked: currentEquipment === 'halter' },
        { name: 'equipment', type: 'radio', label: '🤲 Peso Corporal', value: 'peso_corporal', checked: currentEquipment === 'peso_corporal' },
        { name: 'equipment', type: 'radio', label: '🏃 Esteira', value: 'esteira', checked: currentEquipment === 'esteira' },
        { name: 'equipment', type: 'radio', label: '🚴 Bicicleta', value: 'bicicleta', checked: currentEquipment === 'bicicleta' },
        { name: 'equipment', type: 'radio', label: '⚡ Elíptico', value: 'eliptico', checked: currentEquipment === 'eliptico' },
        { name: 'equipment', type: 'radio', label: '❌ Nenhum', value: 'nenhum', checked: currentEquipment === 'nenhum' || !currentEquipment }
      ],
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        {
          text: 'Próximo',
          handler: async (equipmentData) => {
            if (equipmentData) {
              await this.showEditExerciseDetailsForm(exercise, muscleGroup, equipmentData);
            }
            return true;
          }
        }
      ]
    });

    await equipmentAlert.present();
  }

  async showEditExerciseDetailsForm(exercise: ExerciseLibraryItem, muscleGroup: string, equipment: string) {
    const detailsAlert = await this.alertController.create({
      header: 'Editar Exercício',
      message: `Grupo: ${this.getMuscleGroupName(muscleGroup)} | Equipamento: ${this.getEquipmentName(equipment)}<br><br>Edite os detalhes do exercício:`,
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nome do exercício *',
          value: exercise.name,
          attributes: { maxlength: 50 }
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Descrição do exercício (o que fazer) *',
          value: exercise.description || '',
          attributes: { rows: 3, maxlength: 300 }
        },
        {
          name: 'instructions',
          type: 'textarea',
          placeholder: 'Instruções passo a passo (1- ... 2- ... 3- ...) *',
          value: exercise.instructions,
          attributes: { rows: 5, maxlength: 800 }
        },
        {
          name: 'duration',
          type: 'number',
          placeholder: 'Duração em minutos *',
          value: exercise.duration?.toString() || '30',
          min: 1,
          max: 120
        },
        {
          name: 'calories',
          type: 'number',
          placeholder: 'Calorias estimadas *',
          value: exercise.calories?.toString() || '100',
          min: 10,
          max: 1000
        }
      ],
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        {
          text: 'Próximo - Selecionar Dificuldade',
          handler: async (data) => {
            if (data.name && data.description && data.instructions && data.duration && data.calories) {
              await this.showEditDifficultySelection(exercise, muscleGroup, equipment, data);
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

  async showEditDifficultySelection(exercise: ExerciseLibraryItem, muscleGroup: string, equipment: string, exerciseData: any) {
    const difficultyAlert = await this.alertController.create({
      header: 'Editar Dificuldade',
      message: 'Escolha o nível de dificuldade do exercício:',
      inputs: [
        {
          name: 'difficulty',
          type: 'radio',
          label: '🟢 Iniciante',
          value: 'beginner',
          checked: exercise.difficulty === 'beginner'
        },
        {
          name: 'difficulty',
          type: 'radio',
          label: '🟡 Intermediário',
          value: 'intermediate',
          checked: exercise.difficulty === 'intermediate'
        },
        {
          name: 'difficulty',
          type: 'radio',
          label: '🔴 Avançado',
          value: 'advanced',
          checked: exercise.difficulty === 'advanced'
        }
      ],
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        {
          text: 'Salvar Alterações',
          handler: async (difficultyData) => {
            if (difficultyData) {
              const completeData = {
                ...exerciseData,
                muscleGroup,
                equipment,
                difficulty: difficultyData
              };
              await this.updateCustomExercise(exercise.id, completeData);
              return true;
            } else {
              await this.showToast('Por favor, selecione uma dificuldade', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await difficultyAlert.present();
  }

  private async updateCustomExercise(exerciseId: string, updatedData: any) {
    try {
      // Processar instruções para garantir numeração
      const formattedInstructions = this.formatInstructions(updatedData.instructions);

      const updates: Partial<ExerciseLibraryItem> = {
        name: updatedData.name,
        category: this.mapMuscleGroupToCategory(updatedData.muscleGroup),
        muscleGroups: [updatedData.muscleGroup],
        equipment: updatedData.equipment !== 'nenhum' ? [updatedData.equipment] : [],
        instructions: formattedInstructions,
        difficulty: updatedData.difficulty,
        duration: parseInt(updatedData.duration),
        calories: parseInt(updatedData.calories),
        description: updatedData.description
      };

      this.exerciseService.updateCustomExercise(exerciseId, updates).subscribe({
        next: (updatedExercise) => {
          this.showToast(`Exercício "${updatedData.name}" atualizado com sucesso!`, 'success');
          // Não precisa chamar loadExercises() - o service já atualiza automaticamente
        },
        error: (error) => {
          console.error('Erro ao atualizar exercício:', error);
          this.showToast('Erro ao atualizar exercício', 'danger');
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar exercício:', error);
      await this.showToast('Erro ao atualizar exercício', 'danger');
    }
  }

  // Excluir exercício personalizado
  async deleteCustomExercise(exercise: ExerciseLibraryItem) {
    if (!this.isCustomExercise(exercise.id)) {
      await this.showToast('Somente exercícios personalizados podem ser excluídos', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir o exercício "${exercise.name}"? Esta ação não pode ser desfeita.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: async () => {
            try {
              this.exerciseService.deleteCustomExercise(exercise.id).subscribe({
                next: () => {
                  this.showToast(`Exercício "${exercise.name}" excluído com sucesso!`, 'success');
                  // Não precisa chamar loadExercises() - o service já atualiza automaticamente
                },
                error: (error) => {
                  console.error('Erro ao excluir exercício:', error);
                  this.showToast('Erro ao excluir exercício', 'danger');
                }
              });
            } catch (error) {
              console.error('Erro ao excluir exercício:', error);
              await this.showToast('Erro ao excluir exercício', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Método para formatar instruções com numeração automática
  private formatInstructions(instructions: string): string {
    if (!instructions) return '';

    // Dividir por linhas e processar
    const lines = instructions.split('\n').filter(line => line.trim() !== '');
    const formattedLines = lines.map((line, index) => {
      const trimmedLine = line.trim();
      // Se a linha já não começa com número, adicionar
      if (!/^\d+[\.\-\)\:]/.test(trimmedLine)) {
        return `${index + 1}- ${trimmedLine}`;
      }
      return trimmedLine;
    });

    return formattedLines.join('\n');
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
          name: 'description',
          type: 'textarea',
          placeholder: 'Descrição do exercício (o que fazer) *',
          attributes: { rows: 3, maxlength: 300 }
        },
        {
          name: 'instructions',
          type: 'textarea',
          placeholder: 'Instruções passo a passo (1- ... 2- ... 3- ...) *',
          attributes: { rows: 5, maxlength: 800 }
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
        }
      ],
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        {
          text: 'Próximo - Selecionar Dificuldade',
          handler: async (data) => {
            if (data.name && data.description && data.instructions && data.duration && data.calories) {
              await this.showDifficultySelection(muscleGroup, equipment, data);
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

  async showDifficultySelection(muscleGroup: string, equipment: string, exerciseData: any) {
    const difficultyAlert = await this.alertController.create({
      header: 'Selecionar Dificuldade',
      message: 'Escolha o nível de dificuldade do exercício:',
      inputs: [
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
        }
      ],
      buttons: [
        { text: 'Voltar', role: 'cancel' },
        {
          text: 'Criar Exercício',
          handler: async (difficultyData) => {
            if (difficultyData) {
              const completeData = {
                ...exerciseData,
                muscleGroup,
                equipment,
                difficulty: difficultyData
              };
              await this.saveCustomExercise(completeData);
              return true;
            } else {
              await this.showToast('Por favor, selecione uma dificuldade', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await difficultyAlert.present();
  }

  private async saveCustomExercise(exerciseData: any) {
    try {
      const emoji = this.getMuscleGroupEmoji(exerciseData.muscleGroup);

      // Processar instruções para garantir numeração
      const formattedInstructions = this.formatInstructions(exerciseData.instructions);

      const newExercise: Omit<ExerciseLibraryItem, 'id'> = {
        name: exerciseData.name,
        category: this.mapMuscleGroupToCategory(exerciseData.muscleGroup),
        muscleGroups: [exerciseData.muscleGroup],
        equipment: exerciseData.equipment !== 'nenhum' ? [exerciseData.equipment] : [],
        instructions: formattedInstructions,
        difficulty: exerciseData.difficulty,
        duration: parseInt(exerciseData.duration),
        calories: parseInt(exerciseData.calories),
        emoji: emoji,
        imageUrl: undefined,
        description: exerciseData.description
      };

      console.log('ListaPage: Criando exercício:', newExercise.name);

      this.exerciseService.addCustomExercise(newExercise).subscribe({
        next: (createdExercise) => {
          console.log('ListaPage: Exercício criado com sucesso:', createdExercise.id);
          this.showToast(`${emoji} Exercício "${exerciseData.name}" criado com sucesso!`, 'success');
          // A lista será atualizada automaticamente via subscription do service
        },
        error: (error) => {
          console.error('ListaPage: Erro ao criar exercício:', error);
          this.showToast('Erro ao criar exercício', 'danger');
        }
      });
    } catch (error) {
      console.error('ListaPage: Erro ao salvar exercício:', error);
      await this.showToast('Erro ao salvar exercício', 'danger');
    }
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

  async showFilterOptions() {
    console.log('Show filter options');
    await this.showToast('Opções de filtro em desenvolvimento', 'primary');
  }

  trackByExerciseId(index: number, exercise: ExerciseLibraryItem): string {
    return exercise.id;
  }

  convertToExerciseData(item: ExerciseLibraryItem): ExerciseData {
    return {
      id: item.id,
      name: item.name,
      muscleGroup: item.category,
      equipment: item.equipment.join(', ') || 'Nenhum',
      difficulty: item.difficulty,
      instructions: [item.instructions],
      primaryMuscles: item.muscleGroups,
      secondaryMuscles: [],
      tips: [],
      imageUrl: item.imageUrl,
      description: item.description || item.instructions,
      duration: item.duration?.toString() || '0',
      calories: item.calories || 0,
      muscleGroups: item.muscleGroups,
      commonMistakes: [],
      emoji: item.emoji
    };
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

  // Função para limpar TODOS os exercícios (para teste)
  async clearAllExercises() {
    const alert = await this.alertController.create({
      header: 'Limpar Todos os Exercícios',
      message: 'ATENÇÃO: Isso irá remover TODOS os exercícios da biblioteca permanentemente. Deseja continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sim, Limpar Tudo',
          handler: () => {
            this.exerciseService.clearAllExercises().subscribe({
              next: (success) => {
                if (success) {
                  this.showToast('Todos os exercícios foram removidos com sucesso!', 'success');
                  // Não precisa chamar loadExercises() - o service já atualiza automaticamente
                } else {
                  this.showToast('Erro ao limpar exercícios', 'danger');
                }
              },
              error: (error) => {
                console.error('Erro ao limpar exercícios:', error);
                this.showToast('Erro ao limpar exercícios', 'danger');
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  // Função para remover exercícios duplicados
  async removeDuplicates() {
    const alert = await this.alertController.create({
      header: 'Remover Duplicatas',
      message: 'Isso irá verificar e remover exercícios duplicados da biblioteca. Deseja continuar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sim, Remover Duplicatas',
          handler: () => {
            this.exerciseService.removeDuplicates().subscribe({
              next: (removed) => {
                if (removed) {
                  this.showToast('Duplicatas removidas com sucesso!', 'success');
                } else {
                  this.showToast('Nenhuma duplicata encontrada', 'medium');
                }
              },
              error: (error) => {
                console.error('Erro ao remover duplicatas:', error);
                this.showToast('Erro ao remover duplicatas', 'danger');
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }
}
