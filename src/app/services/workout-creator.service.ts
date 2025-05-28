import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { JsonDataService, ExerciseData } from './json-data.service';

export interface WorkoutExercise {
  exerciseId: string;
  exercise: ExerciseData;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number; // in seconds
  restTime?: number; // in seconds
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  estimatedDuration: number; // in minutes
  targetMuscleGroups: string[];
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
  isCustom: boolean;
  tags: string[];
}

export interface WorkoutSession {
  id: string;
  workoutPlanId: string;
  workoutPlan: WorkoutPlan;
  startTime: string;
  endTime?: string;
  completedExercises: {
    exerciseId: string;
    completedSets: number;
    actualReps: number[];
    actualWeights: number[];
    notes?: string;
  }[];
  totalCalories?: number;
  totalDuration?: number; // in minutes
  status: 'in-progress' | 'completed' | 'paused' | 'cancelled';
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkoutCreatorService {

  constructor(
    private storageService: StorageService,
    private jsonDataService: JsonDataService
  ) { }

  // Workout Plan Management
  async createWorkoutPlan(name: string, description: string, difficulty: 'Fácil' | 'Médio' | 'Difícil'): Promise<WorkoutPlan> {
    const workoutPlan: WorkoutPlan = {
      id: this.generateId(),
      name,
      description,
      difficulty,
      estimatedDuration: 0,
      targetMuscleGroups: [],
      exercises: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isCustom: true,
      tags: []
    };

    const workoutPlans = await this.getWorkoutPlans();
    workoutPlans.push(workoutPlan);
    await this.storageService.set('workout-plans', workoutPlans);

    return workoutPlan;
  }

  async getWorkoutPlans(): Promise<WorkoutPlan[]> {
    return await this.storageService.get('workout-plans') || [];
  }

  async getWorkoutPlan(id: string): Promise<WorkoutPlan | null> {
    const plans = await this.getWorkoutPlans();
    return plans.find(plan => plan.id === id) || null;
  }

  async updateWorkoutPlan(updatedPlan: WorkoutPlan): Promise<void> {
    updatedPlan.updatedAt = new Date().toISOString();
    const plans = await this.getWorkoutPlans();
    const index = plans.findIndex(plan => plan.id === updatedPlan.id);
    
    if (index !== -1) {
      plans[index] = updatedPlan;
      await this.storageService.set('workout-plans', plans);
    }
  }

  async deleteWorkoutPlan(id: string): Promise<void> {
    const plans = await this.getWorkoutPlans();
    const filteredPlans = plans.filter(plan => plan.id !== id);
    await this.storageService.set('workout-plans', filteredPlans);
  }

  // Exercise Management in Workout Plans
  async addExerciseToWorkout(workoutId: string, exerciseId: string, sets: number = 3, reps: number = 10): Promise<void> {
    const workoutPlan = await this.getWorkoutPlan(workoutId);
    if (!workoutPlan) throw new Error('Workout plan not found');

    const fitnessData = await this.jsonDataService.getFitnessData();
    const exercise = fitnessData.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    const workoutExercise: WorkoutExercise = {
      exerciseId,
      exercise,
      sets,
      reps,
      restTime: 60 // default 60 seconds rest
    };

    workoutPlan.exercises.push(workoutExercise);
    
    // Update estimated duration and target muscle groups
    this.updateWorkoutMetadata(workoutPlan);
    
    await this.updateWorkoutPlan(workoutPlan);
  }

  async removeExerciseFromWorkout(workoutId: string, exerciseId: string): Promise<void> {
    const workoutPlan = await this.getWorkoutPlan(workoutId);
    if (!workoutPlan) throw new Error('Workout plan not found');

    workoutPlan.exercises = workoutPlan.exercises.filter(ex => ex.exerciseId !== exerciseId);
    
    this.updateWorkoutMetadata(workoutPlan);
    await this.updateWorkoutPlan(workoutPlan);
  }

  async updateExerciseInWorkout(workoutId: string, exerciseId: string, updates: Partial<WorkoutExercise>): Promise<void> {
    const workoutPlan = await this.getWorkoutPlan(workoutId);
    if (!workoutPlan) throw new Error('Workout plan not found');

    const exerciseIndex = workoutPlan.exercises.findIndex(ex => ex.exerciseId === exerciseId);
    if (exerciseIndex === -1) throw new Error('Exercise not found in workout');

    workoutPlan.exercises[exerciseIndex] = { ...workoutPlan.exercises[exerciseIndex], ...updates };
    
    this.updateWorkoutMetadata(workoutPlan);
    await this.updateWorkoutPlan(workoutPlan);
  }

  // Workout Session Management
  async startWorkoutSession(workoutPlanId: string): Promise<WorkoutSession> {
    const workoutPlan = await this.getWorkoutPlan(workoutPlanId);
    if (!workoutPlan) throw new Error('Workout plan not found');

    const session: WorkoutSession = {
      id: this.generateId(),
      workoutPlanId,
      workoutPlan,
      startTime: new Date().toISOString(),
      completedExercises: [],
      status: 'in-progress'
    };

    const sessions = await this.getWorkoutSessions();
    sessions.push(session);
    await this.storageService.set('workout-sessions', sessions);

    return session;
  }

  async getWorkoutSessions(): Promise<WorkoutSession[]> {
    return await this.storageService.get('workout-sessions') || [];
  }

  async getWorkoutSession(id: string): Promise<WorkoutSession | null> {
    const sessions = await this.getWorkoutSessions();
    return sessions.find(session => session.id === id) || null;
  }

  async updateWorkoutSession(updatedSession: WorkoutSession): Promise<void> {
    const sessions = await this.getWorkoutSessions();
    const index = sessions.findIndex(session => session.id === updatedSession.id);
    
    if (index !== -1) {
      sessions[index] = updatedSession;
      await this.storageService.set('workout-sessions', sessions);
    }
  }

  async completeWorkoutSession(sessionId: string, totalCalories?: number): Promise<void> {
    const session = await this.getWorkoutSession(sessionId);
    if (!session) throw new Error('Workout session not found');

    session.endTime = new Date().toISOString();
    session.status = 'completed';
    session.totalCalories = totalCalories;
    
    if (session.startTime && session.endTime) {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      session.totalDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    }

    await this.updateWorkoutSession(session);

    // Add to workout history
    await this.addWorkoutToHistory(session);
  }

  async pauseWorkoutSession(sessionId: string): Promise<void> {
    const session = await this.getWorkoutSession(sessionId);
    if (!session) throw new Error('Workout session not found');

    session.status = 'paused';
    await this.updateWorkoutSession(session);
  }

  async resumeWorkoutSession(sessionId: string): Promise<void> {
    const session = await this.getWorkoutSession(sessionId);
    if (!session) throw new Error('Workout session not found');

    session.status = 'in-progress';
    await this.updateWorkoutSession(session);
  }

  async cancelWorkoutSession(sessionId: string): Promise<void> {
    const session = await this.getWorkoutSession(sessionId);
    if (!session) throw new Error('Workout session not found');

    session.status = 'cancelled';
    session.endTime = new Date().toISOString();
    await this.updateWorkoutSession(session);
  }

  // Quick Workout Generation
  async generateQuickWorkout(targetMuscleGroups: string[], duration: number = 30, difficulty: 'Fácil' | 'Médio' | 'Difícil' = 'Médio'): Promise<WorkoutPlan> {
    const fitnessData = await this.jsonDataService.getFitnessData();
    
    // Filter exercises by muscle groups and difficulty
    let availableExercises = fitnessData.exercises.filter(exercise => 
      exercise.muscleGroups?.some(group => targetMuscleGroups.includes(group)) &&
      exercise.difficulty === difficulty
    );

    // If not enough exercises, include different difficulty levels
    if (availableExercises.length < 3) {
      availableExercises = fitnessData.exercises.filter(exercise => 
        exercise.muscleGroups?.some(group => targetMuscleGroups.includes(group))
      );
    }

    // Select random exercises
    const selectedExercises = this.shuffleArray(availableExercises).slice(0, Math.min(6, availableExercises.length));

    const workoutPlan = await this.createWorkoutPlan(
      `Treino Rápido ${duration}min`,
      `Treino gerado automaticamente para ${targetMuscleGroups.join(', ')}`,
      difficulty
    );

    // Add exercises to workout
    for (const exercise of selectedExercises) {
      const sets = this.getRecommendedSets(difficulty);
      const reps = this.getRecommendedReps(exercise.type || 'strength', difficulty);
      
      await this.addExerciseToWorkout(workoutPlan.id, exercise.id, sets, reps);
    }

    return await this.getWorkoutPlan(workoutPlan.id) as WorkoutPlan;
  }

  // Template Management
  async saveWorkoutAsTemplate(sessionId: string, templateName: string): Promise<WorkoutPlan> {
    const session = await this.getWorkoutSession(sessionId);
    if (!session) throw new Error('Workout session not found');

    const template: WorkoutPlan = {
      ...session.workoutPlan,
      id: this.generateId(),
      name: templateName,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [...session.workoutPlan.tags, 'template']
    };

    const plans = await this.getWorkoutPlans();
    plans.push(template);
    await this.storageService.set('workout-plans', plans);

    return template;
  }

  // Utility Methods
  private updateWorkoutMetadata(workoutPlan: WorkoutPlan): void {
    // Calculate estimated duration
    let totalDuration = 0;
    workoutPlan.exercises.forEach(exercise => {
      const exerciseTime = (exercise.sets * (exercise.duration || 30)) + ((exercise.sets - 1) * (exercise.restTime || 60));
      totalDuration += exerciseTime;
    });
    workoutPlan.estimatedDuration = Math.ceil(totalDuration / 60); // Convert to minutes

    // Update target muscle groups
    const muscleGroups = new Set<string>();
    workoutPlan.exercises.forEach(exercise => {
      exercise.exercise.muscleGroups?.forEach(group => muscleGroups.add(group));
    });
    workoutPlan.targetMuscleGroups = Array.from(muscleGroups);
  }

  private async addWorkoutToHistory(session: WorkoutSession): Promise<void> {
    const history = await this.storageService.get('workout-history') || [];
    history.push({
      id: session.id,
      name: session.workoutPlan.name,
      date: session.startTime,
      duration: session.totalDuration || 0,
      caloriesBurned: session.totalCalories || 0,
      exercisesCompleted: session.completedExercises.length,
      completed: session.status === 'completed'
    });
    await this.storageService.set('workout-history', history);
  }

  private getRecommendedSets(difficulty: string): number {
    switch (difficulty) {
      case 'Fácil': return 2;
      case 'Médio': return 3;
      case 'Difícil': return 4;
      default: return 3;
    }
  }

  private getRecommendedReps(exerciseType: string, difficulty: string): number {
    const baseReps = {
      'strength': 8,
      'cardio': 30,
      'flexibility': 10,
      'endurance': 15
    };

    const multiplier = {
      'Fácil': 0.8,
      'Médio': 1.0,
      'Difícil': 1.3
    };

    return Math.round((baseReps[exerciseType as keyof typeof baseReps] || 10) * (multiplier[difficulty as keyof typeof multiplier] || 1));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
