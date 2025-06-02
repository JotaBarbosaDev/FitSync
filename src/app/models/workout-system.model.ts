// Modelos para o sistema completo de treinos

export interface CustomWorkout {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  estimatedDuration: number; // em minutos
  difficulty: 'easy' | 'medium' | 'hard';
  muscleGroups: string[];
  equipment: string[];
  createdBy: string; // user ID
  createdAt: Date;
  updatedAt: Date;
  isTemplate: boolean;
  category: 'strength' | 'cardio' | 'flexibility' | 'mixed';
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string; // referência ao exercício da biblioteca
  order: number;
  sets: ExerciseSet[];
  restTime: number; // segundos entre séries
  notes?: string;
}

export interface ExerciseSet {
  id: string;
  reps?: number;
  weight?: number; // kg
  duration?: number; // segundos (para exercícios baseados em tempo)
  distance?: number; // metros (para cardio)
  completed: boolean;
  restTime?: number; // tempo de descanso específico desta série
}

export interface WeeklyPlan {
  id: string;
  name: string;
  userId: string;
  days: {
    monday: DayPlan;
    tuesday: DayPlan;
    wednesday: DayPlan;
    thursday: DayPlan;
    friday: DayPlan;
    saturday: DayPlan;
    sunday: DayPlan;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutos
  exercises: SessionExercise[];
  caloriesBurned?: number;
  notes?: string;
  rating?: number; // 1-5 estrelas
  status: 'in-progress' | 'completed' | 'paused' | 'cancelled';
  dayOfWeek: string;
}

export interface SessionExercise {
  exerciseId: string;
  sets: CompletedSet[];
  restTimes: number[]; // tempo de descanso entre cada série
  startTime: Date;
  endTime?: Date;
  notes?: string;
}

export interface CompletedSet {
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  completed: boolean;
  startTime: Date;
  endTime?: Date;
}

export interface WorkoutProgress {
  exerciseId: string;
  date: Date;
  bestSet: {
    reps?: number;
    weight?: number;
    duration?: number;
    distance?: number;
  };
  totalVolume?: number; // reps * weight
  oneRepMax?: number; // calculado
  personalRecord: boolean;
}

export interface WorkoutStats {
  userId: string;
  totalWorkouts: number;
  totalDuration: number; // minutos
  totalCalories: number;
  averageRating: number;
  favoriteExercises: string[]; // exerciseIds
  progressByExercise: Map<string, WorkoutProgress[]>;
  weeklyStats: {
    week: string; // YYYY-WW
    workouts: number;
    duration: number;
    calories: number;
  }[];
  monthlyStats: {
    month: string; // YYYY-MM
    workouts: number;
    duration: number;
    calories: number;
  }[];
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  muscleGroups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'strength' | 'cardio' | 'flexibility' | 'balance';
  imageUrl?: string;
  videoUrl?: string;
  tips: string[];
  variations?: string[];
  safetyNotes?: string[];
  isCustom: boolean;
  createdBy?: string; // user ID se for custom
  createdAt: Date;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  type: 'workout' | 'rest'; // tipo do dia
  workoutId?: string;
  isRestDay: boolean;
  completed: boolean;
  sessionId?: string; // se o treino foi executado
}

export interface RestTime {
  exerciseId: string;
  setNumber: number;
  duration: number; // segundos
  startTime: Date;
  completed: boolean;
}
