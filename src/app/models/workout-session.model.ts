export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string;
  startTime: Date;
  endTime?: Date;
  completedExercises: string[];
  totalDuration?: number; // minutos
  notes?: string;
  rating?: number; // 1-5 estrelas
}

export interface TimerState {
  isRunning: boolean;
  currentTime: number;
  totalTime: number;
  type: 'rest' | 'workout' | 'exercise';
}
