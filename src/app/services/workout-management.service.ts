import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, combineLatest, of, take } from 'rxjs';
import {
  CustomWorkout,
  WeeklyPlan,
  WorkoutProgress,
  DayPlan,
  SessionExercise,
  CompletedSet
} from '../models';
import { WorkoutSession } from '../models/workout-system.model';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

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

  private timerInterval?: ReturnType<typeof setInterval>;

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private storageService: StorageService
  ) { }

  // ===== CRIAÇÃO DE TREINOS =====

  createCustomWorkout(workout: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Observable<CustomWorkout> {
    return new Observable<CustomWorkout>(observer => {
      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            observer.error(new Error('Usuário não disponível'));
            return;
          }

          const data = this.dataService.getCurrentData();
          if (!data) {
            observer.error(new Error('Dados não disponíveis'));
            return;
          }

          const newWorkout: CustomWorkout = {
            ...workout,
            id: this.dataService.generateId(),
            createdBy: user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          data.customWorkouts = data.customWorkouts || [];
          data.customWorkouts.push(newWorkout as unknown as Record<string, unknown>);

          this.dataService.saveData(data).then(() => {
            observer.next(newWorkout);
            observer.complete();
          }).catch(() => {
            observer.error(new Error('Erro ao salvar treino'));
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  getCustomWorkouts(): Observable<CustomWorkout[]> {
    return new Observable<CustomWorkout[]>(observer => {
      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            observer.next([]);
            observer.complete();
            return;
          }

          const data = this.dataService.getCurrentData();
          if (!data) {
            observer.next([]);
            observer.complete();
            return;
          }

          const userWorkouts = (data.customWorkouts || []).filter((w: Record<string, unknown>) => w['createdBy'] === user.id);
          observer.next(userWorkouts as unknown as CustomWorkout[]);
          observer.complete();
        },
        error: () => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  updateCustomWorkout(workoutId: string, updates: Partial<CustomWorkout>): Observable<CustomWorkout> {
    return new Observable<CustomWorkout>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      const workoutIndex = (data.customWorkouts || []).findIndex((w: Record<string, unknown>) => w['id'] === workoutId);
      if (workoutIndex === -1) {
        observer.error(new Error('Treino não encontrado'));
        return;
      }

      const updatedWorkout = {
        ...data.customWorkouts[workoutIndex],
        ...updates,
        updatedAt: new Date()
      } as CustomWorkout;

      data.customWorkouts[workoutIndex] = updatedWorkout as unknown as Record<string, unknown>;

      this.dataService.saveData(data).then(() => {
        observer.next(updatedWorkout);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao atualizar treino'));
      });
    });
  }

  deleteCustomWorkout(workoutId: string): Observable<boolean> {
    return new Observable<boolean>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      data.customWorkouts = (data.customWorkouts || []).filter((w: Record<string, unknown>) => w['id'] !== workoutId);

      this.dataService.saveData(data).then(() => {
        observer.next(true);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao deletar treino'));
      });
    });
  }

  // ===== PLANEJAMENTO SEMANAL =====

  createWeeklyPlan(name: string): Observable<WeeklyPlan>;
  createWeeklyPlan(plan: Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Observable<WeeklyPlan>;
  createWeeklyPlan(planOrName: string | Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Observable<WeeklyPlan> {
    return new Observable<WeeklyPlan>(observer => {
      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            observer.error(new Error('Usuário não disponível'));
            return;
          }

          const data = this.dataService.getCurrentData();
          if (!data) {
            observer.error(new Error('Dados não disponíveis'));
            return;
          }

          let planData: Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

          if (typeof planOrName === 'string') {
            // Criar plano básico com nome
            planData = {
              name: planOrName,
              isActive: true,
              days: {
                monday: { date: '', type: 'rest', isRestDay: true, completed: false },
                tuesday: { date: '', type: 'rest', isRestDay: true, completed: false },
                wednesday: { date: '', type: 'rest', isRestDay: true, completed: false },
                thursday: { date: '', type: 'rest', isRestDay: true, completed: false },
                friday: { date: '', type: 'rest', isRestDay: true, completed: false },
                saturday: { date: '', type: 'rest', isRestDay: true, completed: false },
                sunday: { date: '', type: 'rest', isRestDay: true, completed: false }
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
            data.weeklyPlans.forEach((p: Record<string, unknown>) => {
              if (p['userId'] === user.id) p['isActive'] = false;
            });
          }

          data.weeklyPlans.push(newPlan as unknown as Record<string, unknown>);

          this.dataService.saveData(data).then(() => {
            observer.next(newPlan);
            observer.complete();
          }).catch(() => {
            observer.error(new Error('Erro ao salvar plano semanal'));
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  getActiveWeeklyPlan(): Observable<WeeklyPlan | null> {
    return new Observable<WeeklyPlan | null>(observer => {
      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            observer.next(null);
            observer.complete();
            return;
          }

          const data = this.dataService.getCurrentData();
          if (!data) {
            observer.next(null);
            observer.complete();
            return;
          }

          const activePlan = (data.weeklyPlans || []).find((p: Record<string, unknown>) =>
            p['userId'] === user.id && p['isActive']
          ) || null;

          observer.next(activePlan as WeeklyPlan | null);
          observer.complete();
        },
        error: () => {
          observer.next(null);
          observer.complete();
        }
      });
    });
  }

  getUserWeeklyPlans(): Observable<WeeklyPlan[]> {
    return new Observable<WeeklyPlan[]>(observer => {
      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            observer.next([]);
            observer.complete();
            return;
          }

          const data = this.dataService.getCurrentData();
          if (!data) {
            observer.next([]);
            observer.complete();
            return;
          }

          const userPlans = (data.weeklyPlans || []).filter((p: Record<string, unknown>) => p['userId'] === user.id);
          observer.next(userPlans as unknown as WeeklyPlan[]);
          observer.complete();
        },
        error: () => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  getTodayWorkout(): Observable<{ workout: CustomWorkout | null; isRestDay: boolean }> {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = dayNames[today.getDay()];

    return combineLatest([
      this.getActiveWeeklyPlan().pipe(take(1)),
      this.getCustomWorkouts().pipe(take(1))
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

  getAllWorkouts(): Observable<CustomWorkout[]> {
    const data = this.dataService.getCurrentData();
    if (!data) return of([]);
    return of((data.customWorkouts || []) as unknown as CustomWorkout[]);
  }

  getCurrentWeeklyPlan(): Observable<WeeklyPlan | null> {
    return this.getActiveWeeklyPlan();
  }

  updateDayPlan(planId: string, day: keyof WeeklyPlan['days'], dayPlan: DayPlan): Observable<WeeklyPlan> {
    return new Observable<WeeklyPlan>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      const planIndex = (data.weeklyPlans || []).findIndex((p: Record<string, unknown>) => p['id'] === planId);
      if (planIndex === -1) {
        observer.error(new Error('Plano não encontrado'));
        return;
      }

      const plan = data.weeklyPlans[planIndex];
      (plan as Record<string, unknown>)['days'] = {
        ...(plan['days'] as Record<string, unknown>),
        [day]: dayPlan
      };
      plan['updatedAt'] = new Date();

      data.weeklyPlans[planIndex] = plan;

      this.dataService.saveData(data).then(() => {
        observer.next(plan as unknown as WeeklyPlan);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar plano'));
      });
    });
  }

  getWorkoutById(workoutId: string): Observable<CustomWorkout | null> {
    const data = this.dataService.getCurrentData();
    if (!data) return of(null);
    const workout = (data.customWorkouts || []).find((w: Record<string, unknown>) => w['id'] === workoutId) || null;
    return of(workout as CustomWorkout | null);
  }

  // ===== EXECUÇÃO DE TREINOS =====

  startWorkoutSession(workoutId: string): Observable<WorkoutSession> {
    return new Observable<WorkoutSession>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            observer.error(new Error('Usuário não disponível'));
            return;
          }

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
          data.workoutSessions2.push(session as unknown as Record<string, unknown>);

          this.dataService.saveData(data).then(() => {
            this.currentSessionSubject.next(session);
            this.startSessionTimer();
            observer.next(session);
            observer.complete();
          }).catch(() => {
            observer.error(new Error('Erro ao salvar sessão'));
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  updateSessionExercise(exerciseId: string, sets: CompletedSet[]): Observable<WorkoutSession> {
    return new Observable<WorkoutSession>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      const currentSession = this.currentSessionSubject.value;
      if (!currentSession) {
        observer.error(new Error('Nenhuma sessão ativa'));
        return;
      }

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: Record<string, unknown>) => s['id'] === currentSession.id);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

      const session = data.workoutSessions2[sessionIndex];

      // Atualizar ou adicionar exercício
      const exerciseIndex = (session['exercises'] as SessionExercise[]).findIndex((e: SessionExercise) => e.exerciseId === exerciseId);

      if (exerciseIndex >= 0) {
        (session['exercises'] as SessionExercise[])[exerciseIndex].sets = sets;
        (session['exercises'] as SessionExercise[])[exerciseIndex].endTime = new Date();
      } else {
        (session['exercises'] as SessionExercise[]).push({
          exerciseId,
          sets,
          restTimes: [],
          startTime: new Date(),
          endTime: new Date()
        });
      }

      data.workoutSessions2[sessionIndex] = session;

      this.dataService.saveData(data).then(() => {
        this.currentSessionSubject.next(session as unknown as WorkoutSession);
        observer.next(session as unknown as WorkoutSession);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar sessão'));
      });
    });
  }

  completeSet(sessionId: string, exerciseIndex: number, completedSet: CompletedSet): Observable<WorkoutSession> {
    return new Observable<WorkoutSession>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: Record<string, unknown>) => s['id'] === sessionId);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

      const session = data.workoutSessions2[sessionIndex];

      // Garantir que o exercício existe
      if (!(session['exercises'] as SessionExercise[])[exerciseIndex]) {
        observer.error(new Error('Exercício não encontrado na sessão'));
        return;
      }

      // Adicionar o set completado
      (session['exercises'] as SessionExercise[])[exerciseIndex].sets.push({
        ...completedSet,
        completed: true,
        startTime: new Date(),
        endTime: new Date()
      });

      data.workoutSessions2[sessionIndex] = session;

      this.dataService.saveData(data).then(() => {
        this.currentSessionSubject.next(session as unknown as WorkoutSession);
        observer.next(session as unknown as WorkoutSession);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar sessão'));
      });
    });
  }

  completeWorkoutSession(caloriesBurned?: number, notes?: string, rating?: number): Observable<WorkoutSession> {
    return new Observable<WorkoutSession>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      const currentSession = this.currentSessionSubject.value;
      if (!currentSession) {
        observer.error(new Error('Nenhuma sessão ativa'));
        return;
      }

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: Record<string, unknown>) => s['id'] === currentSession.id);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

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

      data.workoutSessions2[sessionIndex] = completedSession as unknown as Record<string, unknown>;

      this.dataService.saveData(data).then(() => {
        this.stopSessionTimer();
        this.currentSessionSubject.next(null);

        // Registrar progresso
        this.recordWorkoutProgress(completedSession);

        observer.next(completedSession);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar sessão'));
      });
    });
  }

  pauseWorkoutSession(): Observable<WorkoutSession> {
    return new Observable<WorkoutSession>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      const currentSession = this.currentSessionSubject.value;
      if (!currentSession) {
        observer.error(new Error('Nenhuma sessão ativa'));
        return;
      }

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: Record<string, unknown>) => s['id'] === currentSession.id);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

      const pausedSession = { ...currentSession, status: 'paused' as const };
      data.workoutSessions2[sessionIndex] = pausedSession as unknown as Record<string, unknown>;

      this.dataService.saveData(data).then(() => {
        this.stopSessionTimer();
        this.currentSessionSubject.next(pausedSession);
        observer.next(pausedSession);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar sessão'));
      });
    });
  }

  resumeWorkoutSession(): Observable<WorkoutSession> {
    return new Observable<WorkoutSession>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não disponíveis'));
        return;
      }

      const currentSession = this.currentSessionSubject.value;
      if (!currentSession) {
        observer.error(new Error('Nenhuma sessão ativa'));
        return;
      }

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: Record<string, unknown>) => s['id'] === currentSession.id);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

      const resumedSession = { ...currentSession, status: 'in-progress' as const };
      data.workoutSessions2[sessionIndex] = resumedSession as unknown as Record<string, unknown>;

      this.dataService.saveData(data).then(() => {
        this.startSessionTimer();
        this.currentSessionSubject.next(resumedSession);
        observer.next(resumedSession);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar sessão'));
      });
    });
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
    return new Observable<WorkoutSession[]>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.next([]);
        observer.complete();
        return;
      }

      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            observer.next([]);
            observer.complete();
            return;
          }

          const sessions = (data.workoutSessions2 || [])
            .filter((s: Record<string, unknown>) => s['userId'] === user.id && s['status'] === 'completed')
            .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
              new Date(b['startTime'] as Date).getTime() - new Date(a['startTime'] as Date).getTime()
            );

          observer.next(sessions as unknown as WorkoutSession[]);
          observer.complete();
        },
        error: () => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  getExerciseProgress(exerciseId: string): Observable<WorkoutProgress[]> {
    return new Observable<WorkoutProgress[]>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.next([]);
        observer.complete();
        return;
      }

      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (user) => {
          if (!user) {
            observer.next([]);
            observer.complete();
            return;
          }

          const progress = (data.workoutProgress || [])
            .filter((p: Record<string, unknown>) => p['exerciseId'] === exerciseId)
            .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
              new Date(b['date'] as Date).getTime() - new Date(a['date'] as Date).getTime()
            );

          observer.next(progress as unknown as WorkoutProgress[]);
          observer.complete();
        },
        error: () => {
          observer.next([]);
          observer.complete();
        }
      });
    });
  }

  private recordWorkoutProgress(session: WorkoutSession): void {
    const data = this.dataService.getCurrentData();
    if (!data) return;

    data.workoutProgress = data.workoutProgress || [];

    session.exercises.forEach((exercise: SessionExercise) => {
      const completedSets = exercise.sets.filter((set: CompletedSet) => set.completed);
      if (completedSets.length === 0) return;

      // Encontrar o melhor set
      const bestSet = completedSets.reduce((best: CompletedSet, current: CompletedSet) => {
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
        totalVolume: completedSets.reduce((total: number, set: CompletedSet) =>
          total + ((set.reps || 0) * (set.weight || 0)), 0
        ),
        personalRecord: false
      };

      data.workoutProgress.push(progress as unknown as Record<string, unknown>);
    });

    this.dataService.saveData(data);
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

  // ===== SINCRONIZAÇÃO DE DADOS =====

  async synchronizeWorkoutData(): Promise<void> {
    try {
      console.log('WorkoutManagementService: Starting data synchronization...');

      const data = this.dataService.getCurrentData();
      if (!data) {
        console.log('WorkoutManagementService: No data available for synchronization');
        return;
      }

      // Get all workout sessions from different storage sources
      const workoutSessions = data.workoutSessions || [];
      const workoutSessions2 = data.workoutSessions2 || [];

      // Access additional storage sources
      let additionalSessions: Record<string, unknown>[] = [];

      try {
        const workout_sessions = (await this.storageService.get('workout_sessions') || []) as Record<string, unknown>[];
        const workoutHistory = (await this.storageService.get('workout-history') || []) as Record<string, unknown>[];
        additionalSessions = [...workout_sessions, ...workoutHistory];
      } catch (error) {
        console.warn('WorkoutManagementService: Could not access additional storage sources:', error);
      }

      console.log('WorkoutManagementService: Found sessions:', {
        workoutSessions: workoutSessions.length,
        workoutSessions2: workoutSessions2.length,
        additionalSessions: additionalSessions.length
      });

      // Combine all sessions
      const allSessions = [
        ...workoutSessions,
        ...workoutSessions2,
        ...additionalSessions
      ];

      // Remove duplicates based on timestamp, duration, and exercise count
      const uniqueSessions = this.removeDuplicateSessions(allSessions);

      console.log('WorkoutManagementService: Unique sessions after deduplication:', uniqueSessions.length);

      // Normalize session data to ensure consistent format
      const normalizedSessions = uniqueSessions.map(session => this.normalizeSessionData(session));

      // Update main storage sources with normalized data
      data.workoutSessions = normalizedSessions;
      data.workoutSessions2 = normalizedSessions;

      // Save synchronized data
      await this.dataService.saveData(data);

      // Update additional storage sources
      try {
        await this.storageService.set('workout_sessions', normalizedSessions);
        await this.storageService.set('workout-history', normalizedSessions);
      } catch (error) {
        console.warn('WorkoutManagementService: Could not update additional storage sources:', error);
      }

      console.log('WorkoutManagementService: Data synchronization completed successfully');
    } catch (error) {
      console.error('WorkoutManagementService: Error during data synchronization:', error);
    }
  }

  private removeDuplicateSessions(sessions: Record<string, unknown>[]): Record<string, unknown>[] {
    const uniqueMap = new Map();

    sessions.forEach((session: Record<string, unknown>) => {
      // Create a unique key based on timestamp, duration, and exercise count
      const timestamp = session['startTime'] || session['date'] || session['timestamp'];
      const duration = session['duration'] || 0;
      const exerciseCount = session['exercises'] ? (session['exercises'] as Record<string, unknown>[]).length : 0;

      const key = `${timestamp}_${duration}_${exerciseCount}`;

      // Keep the most complete session (one with more properties)
      const existing = uniqueMap.get(key);
      if (!existing || Object.keys(session).length > Object.keys(existing).length) {
        uniqueMap.set(key, session);
      }
    });

    return Array.from(uniqueMap.values());
  }

  private normalizeSessionData(session: Record<string, unknown>): Record<string, unknown> {
    // Normalize session data to ensure consistent format across all storage systems
    const normalized = {
      id: session['id'] || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workoutId: session['workoutId'] || 'unknown-workout',
      userId: session['userId'] || 'current-user',
      startTime: session['startTime'] || session['date'] || session['timestamp'] || new Date(),
      endTime: session['endTime'] || session['startTime'] || session['date'] || session['timestamp'] || new Date(),
      duration: session['duration'] || 0,
      exercises: session['exercises'] || [],
      caloriesBurned: session['caloriesBurned'] || session['calories'] || 0,
      notes: session['notes'] || '',
      rating: session['rating'] || 0,
      status: session['status'] || 'completed',
      dayOfWeek: session['dayOfWeek'] || new Date().toLocaleDateString('pt-BR', { weekday: 'long' }),
      // Additional fields for compatibility
      date: session['date'] || session['startTime'] || session['timestamp'],
      totalVolume: session['totalVolume'] || 0,
      muscleGroups: session['muscleGroups'] || []
    };

    return normalized;
  }
}
