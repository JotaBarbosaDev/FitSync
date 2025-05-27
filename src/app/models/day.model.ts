import { Workout } from './workout.model';

export interface Day {
  id: string;
  planId: string;
  dayOfWeek: number; // 0-6 (Domingo-Sábado)
  name: string;
  workouts: Workout[];
  isRestDay: boolean;
  notes?: string;
  order: number;
}
