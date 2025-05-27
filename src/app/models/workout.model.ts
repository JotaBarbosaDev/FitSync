import { Exercise } from './exercise.model';

export interface Workout {
  id: string;
  dayId: string;
  name: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'mixed';
  estimatedDuration: number; // minutos
  exercises: Exercise[];
  restBetweenExercises: number; // segundos
  notes?: string;
  order: number;
  completed: boolean;
}
