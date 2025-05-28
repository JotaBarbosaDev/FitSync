import { Day } from './day.model';

export interface Plan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  duration: number; // semanas
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  primaryMuscle?: string;
  days: Day[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
