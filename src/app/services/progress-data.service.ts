import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Storage } from '@ionic/storage-angular';

export interface WorkoutSession {
  id: string;
  date: string;
  exercises: ExercisePerformance[];
  duration: number;
  totalVolume: number;
  muscleGroups: string[];
  notes?: string;
}

export interface ExercisePerformance {
  exerciseId: string;
  exerciseName: string;
  sets: SetPerformance[];
  totalVolume: number;
  oneRepMax?: number;
  muscleGroup: string;
}

export interface SetPerformance {
  reps: number;
  weight: number;
  duration?: number;
  restTime?: number;
  rpe?: number; // Rate of Perceived Exertion
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'strength' | 'volume' | 'consistency' | 'milestone';
  dateEarned: string;
  value?: number;
  isUnlocked: boolean;
}

export interface ProgressStats {
  totalWorkouts: number;
  totalVolume: number;
  averageWorkoutDuration: number;
  consistencyScore: number;
  strongestExercise: string;
  favoriteExercise: string;
  currentStreak: number;
  longestStreak: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProgressDataService {
  private workoutSessionsSubject = new BehaviorSubject<WorkoutSession[]>([]);
  private achievementsSubject = new BehaviorSubject<Achievement[]>([]);
  private progressStatsSubject = new BehaviorSubject<ProgressStats | null>(null);

  public workoutSessions$ = this.workoutSessionsSubject.asObservable();
  public achievements$ = this.achievementsSubject.asObservable();
  public progressStats$ = this.progressStatsSubject.asObservable();

  private storage: Storage | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private ionicStorage: Storage) {
    // Não inicializar automaticamente - será feito quando necessário
  }

  async init() {
    if (this.isInitialized || this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit() {
    try {
      this.storage = await this.ionicStorage.create();
      await this.loadAllData();
      this.isInitialized = true;
    } catch (error) {
      console.error('ProgressDataService: Erro na inicialização:', error);
      this.isInitialized = false;
      this.initPromise = null;
    }
  }

  // Workout Session Methods
  async addWorkoutSession(session: Omit<WorkoutSession, 'id'>): Promise<string> {
    await this.ensureInitialized();
    
    const newSession: WorkoutSession = {
      ...session,
      id: this.generateId()
    };

    const currentSessions = this.workoutSessionsSubject.value;
    const updatedSessions = [...currentSessions, newSession];
    
    await this.saveWorkoutSessions(updatedSessions);
    this.workoutSessionsSubject.next(updatedSessions);
    
    // Update achievements and stats
    await this.updateAchievements();
    await this.updateProgressStats();
    
    return newSession.id;
  }

  async updateWorkoutSession(sessionId: string, updates: Partial<WorkoutSession>): Promise<void> {
    await this.ensureInitialized();
    
    const currentSessions = this.workoutSessionsSubject.value;
    const updatedSessions = currentSessions.map(session =>
      session.id === sessionId ? { ...session, ...updates } : session
    );
    
    await this.saveWorkoutSessions(updatedSessions);
    this.workoutSessionsSubject.next(updatedSessions);
    await this.updateProgressStats();
  }

  async deleteWorkoutSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    
    const currentSessions = this.workoutSessionsSubject.value;
    const updatedSessions = currentSessions.filter(session => session.id !== sessionId);
    
    await this.saveWorkoutSessions(updatedSessions);
    this.workoutSessionsSubject.next(updatedSessions);
    await this.updateProgressStats();
  }

  getWorkoutSessionsByDateRange(startDate: string, endDate: string): WorkoutSession[] {
    const sessions = this.workoutSessionsSubject.value;
    return sessions.filter(session => 
      session.date >= startDate && session.date <= endDate
    );
  }

  getWorkoutSessionsByMuscleGroup(muscleGroup: string): WorkoutSession[] {
    const sessions = this.workoutSessionsSubject.value;
    return sessions.filter(session => 
      session.muscleGroups.includes(muscleGroup)
    );
  }

  // Exercise Progress Methods
  getExerciseProgress(exerciseId: string, days: number = 30): ExercisePerformance[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const sessions = this.workoutSessionsSubject.value;
    const exercisePerformances: ExercisePerformance[] = [];
    
    sessions
      .filter(session => new Date(session.date) >= cutoffDate)
      .forEach(session => {
        const exercisePerf = session.exercises.find(ex => ex.exerciseId === exerciseId);
        if (exercisePerf) {
          exercisePerformances.push(exercisePerf);
        }
      });
    
    return exercisePerformances.sort((a, b) => 
      new Date(this.getSessionDate(a)).getTime() - new Date(this.getSessionDate(b)).getTime()
    );
  }

  getPersonalRecords(exerciseId?: string): { exerciseId: string, exerciseName: string, record: number, date: string }[] {
    const sessions = this.workoutSessionsSubject.value;
    const records: Map<string, { exerciseName: string, record: number, date: string }> = new Map();
    
    sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        if (exerciseId && exercise.exerciseId !== exerciseId) return;
        
        const maxWeight = Math.max(...exercise.sets.map(set => set.weight));
        const currentRecord = records.get(exercise.exerciseId);
        
        if (!currentRecord || maxWeight > currentRecord.record) {
          records.set(exercise.exerciseId, {
            exerciseName: exercise.exerciseName,
            record: maxWeight,
            date: session.date
          });
        }
      });
    });
    
    return Array.from(records.entries()).map(([exerciseId, data]) => ({
      exerciseId,
      ...data
    }));
  }

  // Achievement Methods
  async unlockAchievement(achievementId: string): Promise<void> {
    await this.ensureInitialized();
    
    const currentAchievements = this.achievementsSubject.value;
    const updatedAchievements = currentAchievements.map(achievement =>
      achievement.id === achievementId 
        ? { ...achievement, isUnlocked: true, dateEarned: new Date().toISOString() }
        : achievement
    );
    
    await this.saveAchievements(updatedAchievements);
    this.achievementsSubject.next(updatedAchievements);
  }

  private async updateAchievements(): Promise<void> {
    const sessions = this.workoutSessionsSubject.value;
    const achievements = this.achievementsSubject.value;
    
    // Check for new achievements
    const newAchievements = [...achievements];
    
    // First workout achievement
    const firstWorkoutAchievement = newAchievements.find(a => a.id === 'first_workout');
    if (firstWorkoutAchievement && !firstWorkoutAchievement.isUnlocked && sessions.length > 0) {
      firstWorkoutAchievement.isUnlocked = true;
      firstWorkoutAchievement.dateEarned = sessions[0].date;
    }
    
    // Consistency achievements
    const currentStreak = this.calculateCurrentStreak();
    const streakAchievements = newAchievements.filter(a => a.category === 'consistency');
    
    streakAchievements.forEach(achievement => {
      const requiredStreak = parseInt(achievement.id.split('_')[1]);
      if (!achievement.isUnlocked && currentStreak >= requiredStreak) {
        achievement.isUnlocked = true;
        achievement.dateEarned = new Date().toISOString();
      }
    });
    
    this.achievementsSubject.next(newAchievements);
    await this.saveAchievements(newAchievements);
  }

  // Statistics Methods
  private async updateProgressStats(): Promise<void> {
    const sessions = this.workoutSessionsSubject.value;
    
    if (sessions.length === 0) {
      this.progressStatsSubject.next(null);
      return;
    }
    
    const stats: ProgressStats = {
      totalWorkouts: sessions.length,
      totalVolume: sessions.reduce((sum, session) => sum + session.totalVolume, 0),
      averageWorkoutDuration: sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length,
      consistencyScore: this.calculateConsistencyScore(),
      strongestExercise: this.getStrongestExercise(),
      favoriteExercise: this.getFavoriteExercise(),
      currentStreak: this.calculateCurrentStreak(),
      longestStreak: this.calculateLongestStreak()
    };
    
    this.progressStatsSubject.next(stats);
  }

  private calculateConsistencyScore(): number {
    const sessions = this.workoutSessionsSubject.value;
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentSessions = sessions.filter(session => 
      new Date(session.date) >= last30Days
    );
    
    return Math.min(100, (recentSessions.length / 30) * 100 * 4); // Assuming 4 workouts per week is 100%
  }

  private calculateCurrentStreak(): number {
    const sessions = this.workoutSessionsSubject.value;
    if (sessions.length === 0) return 0;
    
    const sortedSessions = sessions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let streak = 1;
    for (let i = 1; i < sortedSessions.length; i++) {
      const currentDate = new Date(sortedSessions[i-1].date);
      const previousDate = new Date(sortedSessions[i].date);
      const daysDiff = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 3) { // Allow up to 3 days between workouts
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private calculateLongestStreak(): number {
    const sessions = this.workoutSessionsSubject.value;
    if (sessions.length === 0) return 0;
    
    const sortedSessions = sessions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedSessions.length; i++) {
      const currentDate = new Date(sortedSessions[i].date);
      const previousDate = new Date(sortedSessions[i-1].date);
      const daysDiff = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 3) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  }

  private getStrongestExercise(): string {
    const records = this.getPersonalRecords();
    if (records.length === 0) return '';
    
    return records.reduce((strongest, current) => 
      current.record > strongest.record ? current : strongest
    ).exerciseName;
  }

  private getFavoriteExercise(): string {
    const sessions = this.workoutSessionsSubject.value;
    const exerciseCount: Map<string, number> = new Map();
    
    sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        const count = exerciseCount.get(exercise.exerciseName) || 0;
        exerciseCount.set(exercise.exerciseName, count + 1);
      });
    });
    
    if (exerciseCount.size === 0) return '';
    
    return Array.from(exerciseCount.entries())
      .reduce((favorite, [exercise, count]) => 
        count > favorite[1] ? [exercise, count] : favorite
      )[0];
  }

  // Storage Methods
  private async saveWorkoutSessions(sessions: WorkoutSession[]): Promise<void> {
    if (this.storage) {
      await this.storage.set('workout_sessions', sessions);
    }
  }

  private async saveAchievements(achievements: Achievement[]): Promise<void> {
    if (this.storage) {
      await this.storage.set('achievements', achievements);
    }
  }

  private async loadAllData(): Promise<void> {
    if (!this.storage) return;
    
    // Load workout sessions
    const sessions = await this.storage.get('workout_sessions') || [];
    this.workoutSessionsSubject.next(sessions);
    
    // Load achievements
    const achievements = await this.storage.get('achievements') || this.getDefaultAchievements();
    this.achievementsSubject.next(achievements);
    
    // Update stats
    await this.updateProgressStats();
  }

  private getDefaultAchievements(): Achievement[] {
    return [
      {
        id: 'first_workout',
        title: 'Primeiro Treino',
        description: 'Complete seu primeiro treino',
        icon: 'fitness',
        category: 'milestone',
        dateEarned: '',
        isUnlocked: false
      },
      {
        id: 'streak_7',
        title: 'Dedicação Semanal',
        description: '7 dias consecutivos de treino',
        icon: 'calendar',
        category: 'consistency',
        dateEarned: '',
        isUnlocked: false
      },
      {
        id: 'streak_30',
        title: 'Atleta Dedicado',
        description: '30 dias consecutivos de treino',
        icon: 'trophy',
        category: 'consistency',
        dateEarned: '',
        isUnlocked: false
      },
      {
        id: 'volume_1000',
        title: 'Força Bruta',
        description: '1000kg de volume em um treino',
        icon: 'barbell',
        category: 'volume',
        dateEarned: '',
        isUnlocked: false
      },
      {
        id: 'workouts_50',
        title: 'Guerreiro Fitness',
        description: 'Complete 50 treinos',
        icon: 'medal',
        category: 'milestone',
        dateEarned: '',
        isUnlocked: false
      }
    ];
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private getSessionDate(exercise: ExercisePerformance): string {
    const sessions = this.workoutSessionsSubject.value;
    const session = sessions.find(s => s.exercises.includes(exercise));
    return session?.date || '';
  }
}
