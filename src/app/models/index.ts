// Export all models
export * from './user.model';
export * from './plan.model';
export * from './day.model';
export * from './workout.model';
export * from './exercise.model';
export * from './set.model';
export * from './workout-session.model';

// Export timer interfaces
export { TimerState, WorkoutTimer } from '../services/timer.service';

// Export interfaces for data structure
export interface AppData {
  version: string;
  lastUpdated: string;
  users: any[];
  plans: any[];
  days: any[];
  workouts: any[];
  exercises: any[];
  sets: any[];
  workoutSessions: any[];
  exerciseLibrary: any[];
}

export interface ExerciseFilters {
  category?: string;
  equipment?: string[];
  muscleGroups?: string[];
  difficulty?: string;
}
