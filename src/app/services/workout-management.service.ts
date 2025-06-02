import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, combineLatest } from 'rxjs';
import {
  CustomWorkout,
  WorkoutExercise,
  WeeklyPlan,
  WorkoutSession,
  WorkoutProgress,
  ExerciseLibraryItem,
  DayPlan,
  SessionExercise,
  CompletedSet
} from '../models';
import { DataService } from './data.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WorkoutManagementService {
  private currentSessionSubject = new BehaviorSubject<WorkoutSession | null>(null);
  private sessionTimerSubject = new BehaviorSubject<{ startTime: Date; elapsed: number; isRunning: boolean }>({
    startTime: new Date(),
    elapsed: 0,
    isRunning: false
  });

  public currentSession$ = this.currentSessionSubject.asObservable();
  public sessionTimer$ = this.sessionTimerSubject.asObservable();

  private timerInterval?: any;

  constructor(
    private dataService: DataService,
    private authService: AuthService
  ) { }

  // ===== CRIAÇÃO DE TREINOS =====

  createCustomWorkout(workout: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Observable<CustomWorkout> {
    return combineLatest([
      this.dataService.data$,
      this.authService.currentUser$
    ]).pipe(
      map(([data, user]) => {
        if (!data || !user) throw new Error('Dados ou usuário não disponíveis');

        const newWorkout: CustomWorkout = {
          ...workout,
          id: this.dataService.generateId(),
          createdBy: user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        data.customWorkouts = data.customWorkouts || [];
        data.customWorkouts.push(newWorkout);
        this.dataService.saveData(data);

        return newWorkout;
      })
    );
  }

  getCustomWorkouts(): Observable<CustomWorkout[]> {
    return combineLatest([
      this.dataService.data$,
      this.authService.currentUser$
    ]).pipe(
      map(([data, user]) => {
        if (!data || !user) return [];
        return (data.customWorkouts || []).filter((w: CustomWorkout) => w.createdBy === user.id);
      })
    );
  }

  updateCustomWorkout(workoutId: string, updates: Partial<CustomWorkout>): Observable<CustomWorkout> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) throw new Error('Dados não disponíveis');

        const workoutIndex = (data.customWorkouts || []).findIndex((w: CustomWorkout) => w.id === workoutId);
        if (workoutIndex === -1) throw new Error('Treino não encontrado');

        const updatedWorkout = {
          ...data.customWorkouts[workoutIndex],
          ...updates,
          updatedAt: new Date()
        };

        data.customWorkouts[workoutIndex] = updatedWorkout;
        this.dataService.saveData(data);

        return updatedWorkout;
      })
    );
  }

  deleteCustomWorkout(workoutId: string): Observable<boolean> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) throw new Error('Dados não disponíveis');

        data.customWorkouts = (data.customWorkouts || []).filter((w: CustomWorkout) => w.id !== workoutId);
        this.dataService.saveData(data);

        return true;
      })
    );
  }

  // ===== PLANEJAMENTO SEMANAL =====

  createWeeklyPlan(name: string): Observable<WeeklyPlan>;
  createWeeklyPlan(plan: Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Observable<WeeklyPlan>;
  createWeeklyPlan(planOrName: string | Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Observable<WeeklyPlan> {
    return combineLatest([
      this.dataService.data$,
      this.authService.currentUser$
    ]).pipe(
      map(([data, user]) => {
        if (!data || !user) throw new Error('Dados ou usuário não disponíveis');

        let planData: Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

        if (typeof planOrName === 'string') {
          // Criar plano básico com nome
          planData = {
            name: planOrName,
            isActive: true,
            days: {
              monday: { type: 'rest', isRestDay: true },
              tuesday: { type: 'rest', isRestDay: true },
              wednesday: { type: 'rest', isRestDay: true },
              thursday: { type: 'rest', isRestDay: true },
              friday: { type: 'rest', isRestDay: true },
              saturday: { type: 'rest', isRestDay: true },
              sunday: { type: 'rest', isRestDay: true }
            }
          };
        } else {
          planData = planOrName;
        }

        const newPlan: WeeklyPlan = {
          ...planData,
          id: this.dataService.generateId(),
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        data.weeklyPlans = data.weeklyPlans || [];

        // Desativar outros planos se este for ativo
        if (newPlan.isActive) {
          data.weeklyPlans.forEach((p: WeeklyPlan) => {
            if (p.userId === user.id) p.isActive = false;
          });
        }

        data.weeklyPlans.push(newPlan);
        this.dataService.saveData(data);

        return newPlan;
      })
    );
  }

  getActiveWeeklyPlan(): Observable<WeeklyPlan | null> {
    return combineLatest([
      this.dataService.data$,
      this.authService.currentUser$
    ]).pipe(
      map(([data, user]) => {
        if (!data || !user) return null;
        return (data.weeklyPlans || []).find((p: WeeklyPlan) =>
          p.userId === user.id && p.isActive
        ) || null;
      })
    );
  }

  getUserWeeklyPlans(): Observable<WeeklyPlan[]> {
    return combineLatest([
      this.dataService.data$,
      this.authService.currentUser$
    ]).pipe(
      map(([data, user]) => {
        if (!data || !user) return [];
        return (data.weeklyPlans || []).filter((p: WeeklyPlan) => p.userId === user.id);
      })
    );
  }

  getTodayWorkout(): Observable<{ workout: CustomWorkout | null; isRestDay: boolean }> {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = dayNames[today.getDay()];

    return combineLatest([
      this.getActiveWeeklyPlan(),
      this.getCustomWorkouts()
    ]).pipe(
      map(([plan, workouts]) => {
        if (!plan) return { workout: null, isRestDay: false };

        const todayDayPlan = plan.days[todayDay as keyof typeof plan.days];

        if (!todayDayPlan || todayDayPlan.type === 'rest' || todayDayPlan.isRestDay) {
          return { workout: null, isRestDay: true };
        }

        if (!todayDayPlan.workoutId) {
          return { workout: null, isRestDay: false };
        }

        const workout = workouts.find(w => w.id === todayDayPlan.workoutId);
        return { workout: workout || null, isRestDay: false };
      })
    );
  }

  // ===== GERENCIAMENTO DE TREINOS =====

  getWorkoutById(workoutId: string): Observable<CustomWorkout | null> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) return null;
        return (data.customWorkouts || []).find((w: CustomWorkout) => w.id === workoutId) || null;
      })
    );
  }

  // ===== EXECUÇÃO DE TREINOS =====

  startWorkoutSession(workoutId: string): Observable<WorkoutSession> {
    return combineLatest([
      this.dataService.data$,
      this.authService.currentUser$
    ]).pipe(
      map(([data, user]) => {
        if (!data || !user) throw new Error('Dados ou usuário não disponíveis');

        const today = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        const session: WorkoutSession = {
          id: this.dataService.generateId(),
          workoutId,
          userId: user.id,
          startTime: new Date(),
          exercises: [],
          status: 'in-progress',
          dayOfWeek: dayNames[today.getDay()]
        };

        data.workoutSessions2 = data.workoutSessions2 || [];
        data.workoutSessions2.push(session);
        this.dataService.saveData(data);

        this.currentSessionSubject.next(session);
        this.startSessionTimer();

        return session;
      })
    );
  }

  updateSessionExercise(exerciseId: string, sets: CompletedSet[]): Observable<WorkoutSession> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) throw new Error('Dados não disponíveis');

        const currentSession = this.currentSessionSubject.value;
        if (!currentSession) throw new Error('Nenhuma sessão ativa');

        const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === currentSession.id);
        if (sessionIndex === -1) throw new Error('Sessão não encontrada');

        const session = data.workoutSessions2[sessionIndex];

        // Atualizar ou adicionar exercício
        const exerciseIndex = session.exercises.findIndex((e: SessionExercise) => e.exerciseId === exerciseId);

        if (exerciseIndex >= 0) {
          session.exercises[exerciseIndex].sets = sets;
          session.exercises[exerciseIndex].endTime = new Date();
        } else {
          session.exercises.push({
            exerciseId,
            sets,
            restTimes: [],
            startTime: new Date(),
            endTime: new Date()
          });
        }

        data.workoutSessions2[sessionIndex] = session;
        this.dataService.saveData(data);

        this.currentSessionSubject.next(session);
        return session;
      })
    );
  }

  completeSet(sessionId: string, exerciseIndex: number, completedSet: CompletedSet): Observable<WorkoutSession> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) throw new Error('Dados não disponíveis');

        const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === sessionId);
        if (sessionIndex === -1) throw new Error('Sessão não encontrada');

        const session = data.workoutSessions2[sessionIndex];

        // Garantir que o exercício existe
        if (!session.exercises[exerciseIndex]) {
          throw new Error('Exercício não encontrado na sessão');
        }

        // Adicionar o set completado
        session.exercises[exerciseIndex].sets.push({
          ...completedSet,
          completed: true,
          startTime: new Date(),
          endTime: new Date()
        });

        data.workoutSessions2[sessionIndex] = session;
        this.dataService.saveData(data);

        this.currentSessionSubject.next(session);
        return session;
      })
    );
  }

  completeWorkoutSession(caloriesBurned?: number, notes?: string, rating?: number): Observable<WorkoutSession> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) throw new Error('Dados não disponíveis');

        const currentSession = this.currentSessionSubject.value;
        if (!currentSession) throw new Error('Nenhuma sessão ativa');

        const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === currentSession.id);
        if (sessionIndex === -1) throw new Error('Sessão não encontrada');

        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - currentSession.startTime.getTime()) / 60000); // minutos

        const completedSession: WorkoutSession = {
          ...currentSession,
          endTime,
          duration,
          caloriesBurned,
          notes,
          rating,
          status: 'completed'
        };

        data.workoutSessions2[sessionIndex] = completedSession;
        this.dataService.saveData(data);

        this.stopSessionTimer();
        this.currentSessionSubject.next(null);

        // Registrar progresso
        this.recordWorkoutProgress(completedSession);

        return completedSession;
      })
    );
  }

  pauseWorkoutSession(): Observable<WorkoutSession> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) throw new Error('Dados não disponíveis');

        const currentSession = this.currentSessionSubject.value;
        if (!currentSession) throw new Error('Nenhuma sessão ativa');

        const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === currentSession.id);
        if (sessionIndex === -1) throw new Error('Sessão não encontrada');

        const pausedSession = { ...currentSession, status: 'paused' as const };
        data.workoutSessions2[sessionIndex] = pausedSession;
        this.dataService.saveData(data);

        this.stopSessionTimer();
        this.currentSessionSubject.next(pausedSession);

        return pausedSession;
      })
    );
  }

  resumeWorkoutSession(): Observable<WorkoutSession> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) throw new Error('Dados não disponíveis');

        const currentSession = this.currentSessionSubject.value;
        if (!currentSession) throw new Error('Nenhuma sessão ativa');

        const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === currentSession.id);
        if (sessionIndex === -1) throw new Error('Sessão não encontrada');

        const resumedSession = { ...currentSession, status: 'in-progress' as const };
        data.workoutSessions2[sessionIndex] = resumedSession;
        this.dataService.saveData(data);

        this.startSessionTimer();
        this.currentSessionSubject.next(resumedSession);

        return resumedSession;
      })
    );
  }

  // ===== TIMER DA SESSÃO =====

  private startSessionTimer(): void {
    this.stopSessionTimer(); // Garantir que não há timer duplicado

    const startTime = new Date();
    this.sessionTimerSubject.next({
      startTime,
      elapsed: 0,
      isRunning: true
    });

    this.timerInterval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000); // segundos

      this.sessionTimerSubject.next({
        startTime,
        elapsed,
        isRunning: true
      });
    }, 1000);
  }

  private stopSessionTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }

    const currentTimer = this.sessionTimerSubject.value;
    this.sessionTimerSubject.next({
      ...currentTimer,
      isRunning: false
    });
  }

  // ===== HISTÓRICO E PROGRESSO =====

  getUserWorkoutSessions(): Observable<WorkoutSession[]> {
    return combineLatest([
      this.dataService.data$,
      this.authService.currentUser$
    ]).pipe(
      map(([data, user]) => {
        if (!data || !user) return [];
        return (data.workoutSessions2 || [])
          .filter((s: WorkoutSession) => s.userId === user.id && s.status === 'completed')
          .sort((a: WorkoutSession, b: WorkoutSession) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
      })
    );
  }

  getExerciseProgress(exerciseId: string): Observable<WorkoutProgress[]> {
    return combineLatest([
      this.dataService.data$,
      this.authService.currentUser$
    ]).pipe(
      map(([data, user]) => {
        if (!data || !user) return [];
        return (data.workoutProgress || [])
          .filter((p: WorkoutProgress) => p.exerciseId === exerciseId)
          .sort((a: WorkoutProgress, b: WorkoutProgress) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
      })
    );
  }

  private recordWorkoutProgress(session: WorkoutSession): void {
    this.dataService.data$.subscribe(data => {
      if (!data) return;

      data.workoutProgress = data.workoutProgress || [];

      session.exercises.forEach(exercise => {
        const completedSets = exercise.sets.filter(set => set.completed);
        if (completedSets.length === 0) return;

        // Encontrar o melhor set
        const bestSet = completedSets.reduce((best, current) => {
          const currentVolume = (current.reps || 0) * (current.weight || 0);
          const bestVolume = (best.reps || 0) * (best.weight || 0);
          return currentVolume > bestVolume ? current : best;
        });

        const progress: WorkoutProgress = {
          exerciseId: exercise.exerciseId,
          date: session.startTime,
          bestSet: {
            reps: bestSet.reps,
            weight: bestSet.weight,
            duration: bestSet.duration,
            distance: bestSet.distance
          },
          totalVolume: completedSets.reduce((total, set) =>
            total + ((set.reps || 0) * (set.weight || 0)), 0
          ),
          personalRecord: false // TODO: calcular se é recorde
        };

        data.workoutProgress.push(progress);
      });

      this.dataService.saveData(data);
    });
  }

  // ===== ESTATÍSTICAS =====

  getWorkoutStats(): Observable<{
    totalWorkouts: number;
    totalDuration: number;
    totalCalories: number;
    averageRating: number;
    thisWeekWorkouts: number;
    thisMonthWorkouts: number;
  }> {
    return this.getUserWorkoutSessions().pipe(
      map(sessions => {
        const now = new Date();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisWeekSessions = sessions.filter(s =>
          new Date(s.startTime) >= startOfWeek
        );

        const thisMonthSessions = sessions.filter(s =>
          new Date(s.startTime) >= startOfMonth
        );

        const totalDuration = sessions.reduce((total, s) => total + (s.duration || 0), 0);
        const totalCalories = sessions.reduce((total, s) => total + (s.caloriesBurned || 0), 0);
        const ratingsSum = sessions.reduce((total, s) => total + (s.rating || 0), 0);

        return {
          totalWorkouts: sessions.length,
          totalDuration,
          totalCalories,
          averageRating: sessions.length > 0 ? ratingsSum / sessions.length : 0,
          thisWeekWorkouts: thisWeekSessions.length,
          thisMonthWorkouts: thisMonthSessions.length
        };
      })
    );
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}
