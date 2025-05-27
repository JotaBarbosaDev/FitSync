import { Set } from './set.model';

export interface Exercise {
  id: string;
  workoutId: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  sets: Set[];
  instructions?: string;
  demonstration?: string; // URL ou asset
  equipment: string[];
  muscleGroups: string[];
  order: number;
}
