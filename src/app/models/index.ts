// Export all models
export * from './user.model';
export * from './plan.model';
export * from './day.model';
export * from './workout.model';
export * from './exercise.model';
export * from './set.model';
export * from './workout-system.model';

// Export TimerState from workout-session (for compatibility)
export { TimerState } from './workout-session.model';

// Export timer interfaces
export { WorkoutTimer } from '../services/timer.service';

// Export interfaces for data structure
export interface AppData {
  version: string;
  lastUpdated: string;
  users: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  days: Record<string, unknown>[];
  workouts: Record<string, unknown>[];
  exercises: Record<string, unknown>[];
  sets: Record<string, unknown>[];
  workoutSessions: Record<string, unknown>[];
  exerciseLibrary: Record<string, unknown>[];
  // Novos dados para sistema de treinos
  customWorkouts: Record<string, unknown>[];
  weeklyPlans: Record<string, unknown>[];
  workoutSessions2: Record<string, unknown>[]; // nova versão das sessões
  workoutProgress: Record<string, unknown>[];
  dayPlans: Record<string, unknown>[];
}

export interface ExerciseFilters {
  category?: string;
  equipment?: string[];
  muscleGroups?: string[];
  difficulty?: string;
}
