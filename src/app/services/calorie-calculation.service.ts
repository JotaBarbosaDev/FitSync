import { Injectable } from '@angular/core';

// Interface para dados do usuário necessários para cálculo de calorias
export interface UserData {
  weight: number; // peso em kg
  age: number;
  gender: 'male' | 'female';
  height: number; // altura em cm
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
}

// Interface para dados do exercício
export interface ExerciseCalorieData {
  type: 'strength' | 'cardio' | 'flexibility' | 'mixed';
  intensity: 'low' | 'moderate' | 'high' | 'very_high';
  duration: number; // duração em minutos
  muscleGroups: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
}

// Interface para dados de sessão de treino
export interface WorkoutSessionData {
  exercises: ExerciseCalorieData[];
  totalDuration: number; // duração total em minutos
  restTime: number; // tempo de descanso total em minutos
  intensity: 'low' | 'moderate' | 'high' | 'very_high';
}

@Injectable({
  providedIn: 'root'
})
export class CalorieCalculationService {
  
  // Valores MET (Metabolic Equivalent Task) para diferentes tipos de exercícios
  private readonly MET_VALUES = {
    strength: {
      low: 3.0,      // exercícios leves com peso corporal
      moderate: 5.0,  // musculação moderada
      high: 6.0,      // musculação intensa
      very_high: 8.0  // powerlifting, crossfit
    },
    cardio: {
      low: 4.0,       // caminhada lenta
      moderate: 7.0,  // corrida moderada, bicicleta
      high: 10.0,     // corrida rápida, HIIT
      very_high: 12.0 // sprints, exercícios explosivos
    },
    flexibility: {
      low: 2.5,       // alongamento básico
      moderate: 3.0,  // yoga suave
      high: 4.0,      // yoga avançada, pilates
      very_high: 5.0  // hot yoga, pilates avançado
    },
    mixed: {
      low: 4.0,
      moderate: 6.0,
      high: 8.0,
      very_high: 10.0
    }
  };

  // Fatores de ajuste baseados no nível de fitness
  private readonly FITNESS_LEVEL_MULTIPLIERS = {
    beginner: 0.9,     // iniciantes queimam menos calorias devido à eficiência
    intermediate: 1.0,  // padrão
    advanced: 1.1      // atletas queimam mais devido à intensidade
  };

  // Fatores de ajuste baseados na dificuldade do exercício
  private readonly DIFFICULTY_MULTIPLIERS = {
    beginner: 0.8,
    intermediate: 1.0,
    advanced: 1.3
  };

  constructor() {}

  /**
   * Calcula calorias queimadas para um exercício individual
   * Fórmula: Calorias = MET × peso (kg) × tempo (horas)
   */
  calculateExerciseCalories(
    exercise: ExerciseCalorieData, 
    userData: UserData
  ): number {
    // Obter valor MET base para o tipo e intensidade do exercício
    const baseMET = this.MET_VALUES[exercise.type][exercise.intensity];
    
    // Aplicar multiplicadores baseados no nível de fitness e dificuldade
    const fitnessMultiplier = this.FITNESS_LEVEL_MULTIPLIERS[userData.fitnessLevel];
    const difficultyMultiplier = this.DIFFICULTY_MULTIPLIERS[exercise.difficulty];
    
    // Calcular MET ajustado
    const adjustedMET = baseMET * fitnessMultiplier * difficultyMultiplier;
    
    // Converter duração de minutos para horas
    const durationHours = exercise.duration / 60;
    
    // Calcular calorias básicas
    let calories = adjustedMET * userData.weight * durationHours;
    
    // Aplicar ajuste baseado no gênero (mulheres tendem a queimar ~10% menos)
    if (userData.gender === 'female') {
      calories *= 0.9;
    }
    
    // Aplicar ajuste baseado na idade (metabolismo diminui com a idade)
    const ageMultiplier = this.getAgeMultiplier(userData.age);
    calories *= ageMultiplier;
    
    // Aplicar bônus por múltiplos grupos musculares
    const muscleGroupBonus = this.getMuscleGroupBonus(exercise.muscleGroups);
    calories *= muscleGroupBonus;
    
    return Math.round(calories);
  }

  /**
   * Calcula calorias para uma sessão completa de treino
   */
  calculateWorkoutSessionCalories(
    session: WorkoutSessionData,
    userData: UserData
  ): number {
    let totalCalories = 0;
    
    // Somar calorias de todos os exercícios
    for (const exercise of session.exercises) {
      totalCalories += this.calculateExerciseCalories(exercise, userData);
    }
    
    // Adicionar calorias do efeito pós-treino (EPOC - Excess Post-Exercise Oxygen Consumption)
    const epocCalories = this.calculateEPOCCalories(session, userData);
    totalCalories += epocCalories;
    
    // Aplicar fator de correção baseado na intensidade da sessão
    const sessionIntensityMultiplier = this.getSessionIntensityMultiplier(session);
    totalCalories *= sessionIntensityMultiplier;
    
    return Math.round(totalCalories);
  }

  /**
   * Estima calorias para exercícios sem dados completos (modo compatibilidade)
   */
  estimateCaloriesFromBasicData(
    exerciseName: string,
    duration: number,
    difficulty: string,
    userData: UserData
  ): number {
    // Mapear exercício para tipo e intensidade baseado no nome
    const exerciseType = this.inferExerciseType(exerciseName);
    const intensity = this.inferIntensityFromDifficulty(difficulty);
    
    const exerciseData: ExerciseCalorieData = {
      type: exerciseType,
      intensity: intensity,
      duration: duration,
      muscleGroups: ['unknown'],
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced'
    };
    
    return this.calculateExerciseCalories(exerciseData, userData);
  }

  /**
   * Calcula Taxa Metabólica Basal (BMR) usando a fórmula de Mifflin-St Jeor
   */
  calculateBMR(userData: UserData): number {
    if (userData.gender === 'male') {
      return 10 * userData.weight + 6.25 * userData.height - 5 * userData.age + 5;
    } else {
      return 10 * userData.weight + 6.25 * userData.height - 5 * userData.age - 161;
    }
  }

  /**
   * Calcula calorias queimadas em repouso durante o treino
   */
  calculateRestingCaloriesDuringWorkout(duration: number, userData: UserData): number {
    const bmr = this.calculateBMR(userData);
    const caloriesPerMinute = bmr / (24 * 60); // BMR por minuto
    return Math.round(caloriesPerMinute * duration);
  }

  // Métodos auxiliares privados

  private getAgeMultiplier(age: number): number {
    if (age < 25) return 1.05;      // metabolismo mais alto
    if (age < 35) return 1.0;       // metabolismo padrão
    if (age < 45) return 0.95;      // leve diminuição
    if (age < 55) return 0.9;       // diminuição moderada
    return 0.85;                    // diminuição significativa
  }

  private getMuscleGroupBonus(muscleGroups: string[]): number {
    const uniqueGroups = new Set(muscleGroups).size;
    
    if (uniqueGroups >= 4) return 1.15;     // treino corpo inteiro
    if (uniqueGroups >= 3) return 1.1;      // múltiplos grupos
    if (uniqueGroups >= 2) return 1.05;     // dois grupos
    return 1.0;                             // grupo único
  }

  private calculateEPOCCalories(session: WorkoutSessionData, userData: UserData): number {
    // EPOC é mais significativo em treinos de alta intensidade
    let epocFactor = 0;
    
    switch (session.intensity) {
      case 'very_high':
        epocFactor = 0.15; // 15% adicional
        break;
      case 'high':
        epocFactor = 0.1;  // 10% adicional
        break;
      case 'moderate':
        epocFactor = 0.05; // 5% adicional
        break;
      case 'low':
        epocFactor = 0.02; // 2% adicional
        break;
    }
    
    // Estimar calorias base da sessão para calcular EPOC
    const baseCalories = session.totalDuration * 6 * userData.weight / 60; // estimativa básica
    return Math.round(baseCalories * epocFactor);
  }

  private getSessionIntensityMultiplier(session: WorkoutSessionData): number {
    const workoutRatio = session.totalDuration / (session.totalDuration + session.restTime);
    
    // Menos tempo de descanso = maior intensidade
    if (workoutRatio > 0.8) return 1.1;     // muito intenso
    if (workoutRatio > 0.6) return 1.05;    // intenso
    if (workoutRatio > 0.4) return 1.0;     // moderado
    return 0.95;                             // baixa intensidade
  }

  private inferExerciseType(exerciseName: string): 'strength' | 'cardio' | 'flexibility' | 'mixed' {
    const name = exerciseName.toLowerCase();
    
    if (name.includes('corrida') || name.includes('cardio') || name.includes('bike') || 
        name.includes('esteira') || name.includes('aeróbico')) {
      return 'cardio';
    }
    
    if (name.includes('alongamento') || name.includes('yoga') || name.includes('pilates') || 
        name.includes('flex')) {
      return 'flexibility';
    }
    
    if (name.includes('funcional') || name.includes('circuit') || name.includes('hiit') || 
        name.includes('crossfit')) {
      return 'mixed';
    }
    
    // Por padrão, assumir musculação
    return 'strength';
  }

  private inferIntensityFromDifficulty(difficulty: string): 'low' | 'moderate' | 'high' | 'very_high' {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
      case 'iniciante':
        return 'low';
      case 'intermediate':
      case 'intermediário':
        return 'moderate';
      case 'advanced':
      case 'avançado':
        return 'high';
      default:
        return 'moderate';
    }
  }

  /**
   * Método para obter dados padrão do usuário (se não estiverem disponíveis)
   */
  getDefaultUserData(): UserData {
    return {
      weight: 70,
      age: 30,
      gender: 'male',
      height: 175,
      fitnessLevel: 'intermediate'
    };
  }

  /**
   * Valida se os dados do usuário estão completos e válidos
   */
  validateUserData(userData: Partial<UserData>): UserData {
    const defaults = this.getDefaultUserData();
    
    return {
      weight: userData.weight && userData.weight > 0 ? userData.weight : defaults.weight,
      age: userData.age && userData.age > 0 ? userData.age : defaults.age,
      gender: userData.gender || defaults.gender,
      height: userData.height && userData.height > 0 ? userData.height : defaults.height,
      fitnessLevel: userData.fitnessLevel || defaults.fitnessLevel
    };
  }
}
