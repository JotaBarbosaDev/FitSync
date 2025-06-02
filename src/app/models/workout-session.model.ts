// DEPRECATED: Use WorkoutSession from workout-system.model.ts instead
// This file is kept for compatibility with TimerState only

export interface TimerState {
  isRunning: boolean;
  currentTime: number;
  totalTime: number;
  type: 'rest' | 'workout' | 'exercise';
}
