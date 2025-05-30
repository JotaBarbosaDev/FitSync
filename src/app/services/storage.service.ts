import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

export interface AppSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  units: 'metric' | 'imperial';
  language: string;
}

export interface ProgressData {
  [date: string]: {
    workoutsCompleted: number;
    exercisesCompleted: number;
    totalDuration: number;
    caloriesBurned: number;
    personalRecords?: Array<{
      exerciseId: string;
      value: number;
      date: string;
    }>;
  };
}

export interface WorkoutData {
  id: string;
  name: string;
  date: Date;
  duration: number;
  exercises: Exercise[];
  calories: number;
  muscleGroups: string[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  muscleGroup: string;
  equipment: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  height: number;
  weight: number;
  fitnessGoal: string;
  joinDate: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: Date;
  progress: number;
  target: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private _storage: Storage | null = null;

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    // If using, define drivers here: await this.storage.defineDriver(/*...*/);
    const storage = await this.storage.create();
    this._storage = storage;
  }

  // CREATE operations
  public async set<T>(key: string, value: T): Promise<T | undefined> {
    return this._storage?.set(key, value);
  }

  // READ operations
  public async get<T>(key: string): Promise<T | null> {
    return this._storage?.get(key);
  }

  // UPDATE operations
  public async update<T>(key: string, value: T): Promise<T | undefined> {
    return this._storage?.set(key, value);
  }

  // DELETE operations
  public async remove(key: string): Promise<boolean | undefined> {
    return this._storage?.remove(key);
  }

  public async clear(): Promise<void> {
    return this._storage?.clear();
  }

  public async keys(): Promise<string[]> {
    return this._storage?.keys() || [];
  }

  public async length(): Promise<number> {
    return this._storage?.length() || 0;
  }

  // Workout specific methods
  async saveWorkout(workout: WorkoutData): Promise<void> {
    const workouts = await this.getWorkouts();
    workouts.push(workout);
    await this.set('workouts', workouts);
  }

  async getWorkouts(): Promise<WorkoutData[]> {
    return (await this.get('workouts')) || [];
  }

  async getWorkoutById(id: string): Promise<WorkoutData | null> {
    const workouts = await this.getWorkouts();
    return workouts.find(w => w.id === id) || null;
  }

  async deleteWorkout(id: string): Promise<void> {
    const workouts = await this.getWorkouts();
    const filtered = workouts.filter(w => w.id !== id);
    await this.set('workouts', filtered);
  }

  // User Profile methods
  async saveUserProfile(profile: UserProfile): Promise<void> {
    await this.set('userProfile', profile);
  }

  async getUserProfile(): Promise<UserProfile | null> {
    return await this.get('userProfile');
  }

  // Achievements methods
  async saveAchievements(achievements: Achievement[]): Promise<void> {
    await this.set('achievements', achievements);
  }

  async getAchievements(): Promise<Achievement[]> {
    return (await this.get('achievements')) || [];
  }

  async unlockAchievement(achievementId: string): Promise<void> {
    const achievements = await this.getAchievements();
    const achievement = achievements.find(a => a.id === achievementId);
    if (achievement) {
      achievement.unlocked = true;
      achievement.unlockedDate = new Date();
      await this.saveAchievements(achievements);
    }
  }

  // Settings methods
  async saveSettings(settings: AppSettings): Promise<void> {
    await this.set('appSettings', settings);
  }

  async getSettings(): Promise<AppSettings> {
    return (await this.get('appSettings')) || {
      theme: 'dark',
      notifications: true,
      units: 'metric',
      language: 'pt'
    };
  }

  // Exercise data methods
  async saveExerciseData(exercises: Exercise[]): Promise<void> {
    await this.set('exerciseLibrary', exercises);
  }

  async getExerciseData(): Promise<Exercise[]> {
    return (await this.get('exerciseLibrary')) || [];
  }

  // Progress tracking
  async saveProgressData(progressData: ProgressData): Promise<void> {
    await this.set('progressData', progressData);
  }

  async getProgressData(): Promise<ProgressData> {
    return (await this.get('progressData')) || {};
  }
}
