export interface Set {
  id: string;
  exerciseId: string;
  type: 'normal' | 'warmup' | 'dropset' | 'superset';
  reps?: number;
  weight?: number; // kg
  duration?: number; // segundos para exercícios de tempo
  distance?: number; // metros para cardio
  restTime: number; // segundos
  completed: boolean;
  notes?: string;
  targetRPE?: number; // Rate of Perceived Exertion (1-10)
}
