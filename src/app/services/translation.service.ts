import { Injectable } from '@angular/core';

export interface DifficultyLevel {
  key: string;
  label: string;
  color: 'success' | 'warning' | 'danger' | 'medium';
  icon: string;
  description: string;
}

export interface MuscleGroupTranslation {
  key: string;
  label: string;
  icon: string;
  emoji: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  private difficultyLevels: DifficultyLevel[] = [
    {
      key: 'beginner',
      label: 'Iniciante',
      color: 'success',
      icon: 'leaf-outline',
      description: '0-6 meses de experiência'
    },
    {
      key: 'intermediate',
      label: 'Intermediário',
      color: 'warning',
      icon: 'flame-outline',
      description: '6-24 meses de experiência'
    },
    {
      key: 'advanced',
      label: 'Avançado',
      color: 'danger',
      icon: 'flash-outline',
      description: '2+ anos de experiência'
    }
  ];

  private muscleGroups: MuscleGroupTranslation[] = [
    { key: 'chest', label: 'Peito', icon: 'body-outline', emoji: '💪' },
    { key: 'back', label: 'Costas', icon: 'person-outline', emoji: '🏋️' },
    { key: 'legs', label: 'Pernas', icon: 'walk-outline', emoji: '🦵' },
    { key: 'shoulders', label: 'Ombros', icon: 'triangle-outline', emoji: '💪' },
    { key: 'arms', label: 'Braços', icon: 'barbell-outline', emoji: '💪' },
    { key: 'core', label: 'Core', icon: 'nuclear-outline', emoji: '🎯' },
    { key: 'cardio', label: 'Cardio', icon: 'heart-outline', emoji: '❤️' }
  ];

  constructor() { }

  /**
   * Normaliza o valor de dificuldade para o formato padrão em inglês
   */
  normalizeDifficulty(difficulty: string): string {
    if (!difficulty) return 'intermediate';
    
    const normalized = difficulty.toLowerCase().trim();
    
    // Mapeamento de português/variações para inglês
    const mappings: { [key: string]: string } = {
      'iniciante': 'beginner',
      'fácil': 'beginner',
      'easy': 'beginner',
      'básico': 'beginner',
      'médio': 'intermediate',
      'intermediário': 'intermediate',
      'medium': 'intermediate',
      'médium': 'intermediate',
      'difícil': 'advanced',
      'avançado': 'advanced',
      'hard': 'advanced',
      'difficult': 'advanced',
      'expert': 'advanced',
      'experto': 'advanced'
    };
    
    return mappings[normalized] || normalized;
  }

  /**
   * Obtém informações completas sobre um nível de dificuldade
   */
  getDifficultyInfo(difficulty: string): DifficultyLevel {
    const normalizedDifficulty = this.normalizeDifficulty(difficulty);
    return this.difficultyLevels.find(level => level.key === normalizedDifficulty) || 
           this.difficultyLevels[1]; // default para intermediate
  }

  /**
   * Obtém a cor do nível de dificuldade
   */
  getDifficultyColor(difficulty: string): 'success' | 'warning' | 'danger' | 'medium' {
    return this.getDifficultyInfo(difficulty).color;
  }

  /**
   * Obtém o ícone do nível de dificuldade
   */
  getDifficultyIcon(difficulty: string): string {
    return this.getDifficultyInfo(difficulty).icon;
  }

  /**
   * Obtém o rótulo traduzido do nível de dificuldade
   */
  getDifficultyLabel(difficulty: string): string {
    return this.getDifficultyInfo(difficulty).label;
  }

  /**
   * Obtém a descrição do nível de dificuldade
   */
  getDifficultyDescription(difficulty: string): string {
    return this.getDifficultyInfo(difficulty).description;
  }

  /**
   * Obtém todos os níveis de dificuldade disponíveis
   */
  getAllDifficultyLevels(): DifficultyLevel[] {
    return [...this.difficultyLevels];
  }

  /**
   * Normaliza o nome do grupo muscular
   */
  normalizeMuscleGroup(muscleGroup: string): string {
    if (!muscleGroup) return '';
    
    const normalized = muscleGroup.toLowerCase().trim();
    
    // Mapeamento de variações para chaves padrão
    const mappings: { [key: string]: string } = {
      'peito': 'chest',
      'peitoral': 'chest',
      'tórax': 'chest',
      'costas': 'back',
      'dorsal': 'back',
      'pernas': 'legs',
      'quadríceps': 'legs',
      'glúteos': 'legs',
      'panturrilha': 'legs',
      'ombros': 'shoulders',
      'deltoides': 'shoulders',
      'braços': 'arms',
      'bíceps': 'arms',
      'tríceps': 'arms',
      'antebraços': 'arms',
      'abdômen': 'core',
      'abdominal': 'core',
      'abdomen': 'core',
      'cardiovascular': 'cardio',
      'aeróbico': 'cardio'
    };
    
    return mappings[normalized] || normalized;
  }

  /**
   * Obtém informações completas sobre um grupo muscular
   */
  getMuscleGroupInfo(muscleGroup: string): MuscleGroupTranslation {
    const normalizedMuscleGroup = this.normalizeMuscleGroup(muscleGroup);
    return this.muscleGroups.find(group => group.key === normalizedMuscleGroup) || 
           { key: muscleGroup, label: muscleGroup, icon: 'fitness-outline', emoji: '💪' };
  }

  /**
   * Obtém o rótulo traduzido do grupo muscular
   */
  getMuscleGroupLabel(muscleGroup: string): string {
    return this.getMuscleGroupInfo(muscleGroup).label;
  }

  /**
   * Obtém o ícone do grupo muscular
   */
  getMuscleGroupIcon(muscleGroup: string): string {
    return this.getMuscleGroupInfo(muscleGroup).icon;
  }

  /**
   * Obtém o emoji do grupo muscular
   */
  getMuscleGroupEmoji(muscleGroup: string): string {
    return this.getMuscleGroupInfo(muscleGroup).emoji;
  }

  /**
   * Obtém todos os grupos musculares disponíveis
   */
  getAllMuscleGroups(): MuscleGroupTranslation[] {
    return [...this.muscleGroups];
  }

  /**
   * Traduz múltiplos grupos musculares
   */
  translateMuscleGroups(muscleGroups: string[]): string[] {
    return muscleGroups.map(group => this.getMuscleGroupLabel(group));
  }

  /**
   * Traduz termos gerais de equipamentos
   */
  translateEquipment(equipment: string): string {
    if (!equipment) return 'Nenhum';
    
    const equipmentTranslations: { [key: string]: string } = {
      'barbell': 'Barra',
      'dumbbell': 'Halter',
      'dumbbells': 'Halteres',
      'bodyweight': 'Peso corporal',
      'machine': 'Máquina',
      'cable': 'Cabo',
      'kettlebell': 'Kettlebell',
      'resistance_band': 'Banda elástica',
      'pull_up_bar': 'Barra de flexões',
      'bench': 'Banco',
      'none': 'Nenhum'
    };
    
    const normalized = equipment.toLowerCase().trim();
    return equipmentTranslations[normalized] || equipment;
  }

  /**
   * Traduz objetivos de treino
   */
  translateGoal(goal: string): string {
    if (!goal) return '';
    
    const goalTranslations: { [key: string]: string } = {
      'weight_loss': 'Perda de Peso',
      'muscle_gain': 'Ganho de Massa',
      'strength': 'Força',
      'endurance': 'Resistência',
      'flexibility': 'Flexibilidade',
      'marathon': 'Preparação para Maratona',
      'general_fitness': 'Condicionamento Geral'
    };
    
    const normalized = goal.toLowerCase().trim();
    return goalTranslations[normalized] || goal;
  }
}
