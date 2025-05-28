import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StorageService } from './storage.service';

export interface ExerciseData {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: string;
  instructions: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  tips: string[];
  imageUrl?: string;
  videoUrl?: string;
  description?: string;
  duration?: string;
  calories?: number;
  muscleGroups?: string[];
  commonMistakes?: string[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  duration: number;
  frequency: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  restTime: number;
  weight: number;
}

export interface AchievementData {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  exercises: string[];
}

export interface FitnessData {
  exercises: ExerciseData[];
  workoutPlans: WorkoutPlan[];
  achievements: AchievementData[];
  tips: any[];
  muscleGroups: MuscleGroup[];
}

@Injectable({
  providedIn: 'root'
})
export class JsonDataService {
  private fitnessData: FitnessData | null = null;

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {}

  // Load JSON data from assets
  loadFitnessData(): Observable<FitnessData> {
    return this.http.get<FitnessData>('assets/data/fitness-data.json');
  }

  // Get fitness data (synchronous access to loaded data)
  async getFitnessData(): Promise<FitnessData | null> {
    if (this.fitnessData) {
      return this.fitnessData;
    }
    
    // Try to load from storage if not in memory
    try {
      const exercises = await this.storageService.getExerciseData();
      const achievements = await this.storageService.getAchievements();
      const workoutPlans = await this.storageService.get('workoutPlans') || [];
      const muscleGroups = await this.storageService.get('muscleGroups') || [];
      const tips = await this.storageService.get('tips') || [];
      
      return {
        exercises: exercises as unknown as ExerciseData[],
        achievements: achievements as AchievementData[],
        workoutPlans,
        muscleGroups,
        tips
      };
    } catch (error) {
      console.error('Error getting fitness data:', error);
      return null;
    }
  }

  // Initialize app with JSON data
  async initializeAppData(): Promise<void> {
    try {
      // Check if data already exists in storage
      const existingData = await this.storageService.get('appInitialized');
      
      if (!existingData) {
        // Load JSON data and save to storage
        this.loadFitnessData().subscribe(async (data) => {
          this.fitnessData = data;
          
          // Save to storage with type conversion
          await this.storageService.saveExerciseData(data.exercises as any);
          await this.storageService.saveAchievements(data.achievements as any);
          await this.storageService.set('workoutPlans', data.workoutPlans);
          await this.storageService.set('muscleGroups', data.muscleGroups);
          await this.storageService.set('tips', data.tips);
          await this.storageService.set('appInitialized', true);
          
          console.log('App data initialized from JSON');
        });
      } else {
        console.log('App data already initialized');
      }
    } catch (error) {
      console.error('Error initializing app data:', error);
    }
  }

  // Get exercises
  async getExercises(): Promise<ExerciseData[]> {
    if (this.fitnessData) {
      return this.fitnessData.exercises;
    }
    const exercises = await this.storageService.getExerciseData();
    return exercises as unknown as ExerciseData[];
  }

  // Get workout plans
  async getWorkoutPlans(): Promise<WorkoutPlan[]> {
    return (await this.storageService.get('workoutPlans')) || [];
  }

  // Get specific workout plan
  async getWorkoutPlan(id: string): Promise<WorkoutPlan | null> {
    const plans = await this.getWorkoutPlans();
    return plans.find(plan => plan.id === id) || null;
  }

  // Get exercise by ID
  async getExercise(id: string): Promise<ExerciseData | null> {
    const exercises = await this.getExercises();
    return exercises.find(exercise => exercise.id === id) || null;
  }

  // Get exercises by muscle group
  async getExercisesByMuscleGroup(muscleGroup: string): Promise<ExerciseData[]> {
    const exercises = await this.getExercises();
    return exercises.filter(exercise => exercise.muscleGroup === muscleGroup);
  }

  // Get muscle groups
  async getMuscleGroups(): Promise<MuscleGroup[]> {
    return (await this.storageService.get('muscleGroups')) || [];
  }

  // Get tips
  async getTips(): Promise<any[]> {
    return (await this.storageService.get('tips')) || [];
  }

  // Get achievements
  async getAchievements(): Promise<AchievementData[]> {
    const achievements = await this.storageService.getAchievements();
    return achievements as unknown as AchievementData[];
  }

  // Search exercises
  async searchExercises(query: string): Promise<ExerciseData[]> {
    const exercises = await this.getExercises();
    const lowercaseQuery = query.toLowerCase();
    
    return exercises.filter(exercise => 
      exercise.name.toLowerCase().includes(lowercaseQuery) ||
      exercise.muscleGroup.toLowerCase().includes(lowercaseQuery) ||
      exercise.equipment.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Filter exercises by difficulty
  async getExercisesByDifficulty(difficulty: string): Promise<ExerciseData[]> {
    const exercises = await this.getExercises();
    return exercises.filter(exercise => exercise.difficulty === difficulty);
  }

  // Get random tip
  async getRandomTip(): Promise<any> {
    const tips = await this.getTips();
    if (tips.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * tips.length);
    return tips[randomIndex];
  }

  // Get workouts by difficulty
  async getWorkoutPlansByDifficulty(difficulty: string): Promise<WorkoutPlan[]> {
    const plans = await this.getWorkoutPlans();
    return plans.filter(plan => plan.difficulty === difficulty);
  }
}
