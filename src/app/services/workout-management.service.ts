import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, combineLatest, of, take } from 'rxjs';
import {
  CustomWorkout,
  WorkoutExercise,
  WeeklyPlan,
  WorkoutProgress,
  ExerciseLibraryItem,
  DayPlan,
  SessionExercise,
  CompletedSet
} from '../models';
import { WorkoutSession } from '../models/workout-system.model';
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
          data.customWorkouts.push(newWorkout);
          
          this.dataService.saveData(data).then(() => {
            observer.next(newWorkout);
            observer.complete();
          }).catch(error => {
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

          const userWorkouts = (data.customWorkouts || []).filter((w: CustomWorkout) => w.createdBy === user.id);
          observer.next(userWorkouts);
          observer.complete();
        },
        error: (error) => {
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

      const workoutIndex = (data.customWorkouts || []).findIndex((w: CustomWorkout) => w.id === workoutId);
      if (workoutIndex === -1) {
        observer.error(new Error('Treino não encontrado'));
        return;
      }

      const updatedWorkout = {
        ...data.customWorkouts[workoutIndex],
        ...updates,
        updatedAt: new Date()
      };

      data.customWorkouts[workoutIndex] = updatedWorkout;
      
      this.dataService.saveData(data).then(() => {
        observer.next(updatedWorkout);
        observer.complete();
      }).catch(error => {
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

      data.customWorkouts = (data.customWorkouts || []).filter((w: CustomWorkout) => w.id !== workoutId);
      
      this.dataService.saveData(data).then(() => {
        observer.next(true);
        observer.complete();
      }).catch(error => {
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
            data.weeklyPlans.forEach((p: WeeklyPlan) => {
              if (p.userId === user.id) p.isActive = false;
            });
          }

          data.weeklyPlans.push(newPlan);
          
          this.dataService.saveData(data).then(() => {
            observer.next(newPlan);
            observer.complete();
          }).catch(error => {
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

          const activePlan = (data.weeklyPlans || []).find((p: WeeklyPlan) =>
            p.userId === user.id && p.isActive
          ) || null;

          observer.next(activePlan);
          observer.complete();
        },
        error: (error) => {
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

          const userPlans = (data.weeklyPlans || []).filter((p: WeeklyPlan) => p.userId === user.id);
          observer.next(userPlans);
          observer.complete();
        },
        error: (error) => {
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
    return of(data.customWorkouts || []);
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

      const planIndex = (data.weeklyPlans || []).findIndex((p: WeeklyPlan) => p.id === planId);
      if (planIndex === -1) {
        observer.error(new Error('Plano não encontrado'));
        return;
      }

      const plan = data.weeklyPlans[planIndex];
      plan.days[day] = dayPlan;
      plan.updatedAt = new Date();

      data.weeklyPlans[planIndex] = plan;
      
      this.dataService.saveData(data).then(() => {
        observer.next(plan);
        observer.complete();
      }).catch(error => {
        observer.error(new Error('Erro ao salvar plano'));
      });
    });
  }

  getWorkoutById(workoutId: string): Observable<CustomWorkout | null> {
    const data = this.dataService.getCurrentData();
    if (!data) return of(null);
    const workout = (data.customWorkouts || []).find((w: CustomWorkout) => w.id === workoutId) || null;
    return of(workout);
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
          data.workoutSessions2.push(session);
          
          this.dataService.saveData(data).then(() => {
            this.currentSessionSubject.next(session);
            this.startSessionTimer();
            observer.next(session);
            observer.complete();
          }).catch(error => {
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

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === currentSession.id);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

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
      
      this.dataService.saveData(data).then(() => {
        this.currentSessionSubject.next(session);
        observer.next(session);
        observer.complete();
      }).catch(error => {
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

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === sessionId);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

      const session = data.workoutSessions2[sessionIndex];

      // Garantir que o exercício existe
      if (!session.exercises[exerciseIndex]) {
        observer.error(new Error('Exercício não encontrado na sessão'));
        return;
      }

      // Adicionar o set completado
      session.exercises[exerciseIndex].sets.push({
        ...completedSet,
        completed: true,
        startTime: new Date(),
        endTime: new Date()
      });

      data.workoutSessions2[sessionIndex] = session;
      
      this.dataService.saveData(data).then(() => {
        this.currentSessionSubject.next(session);
        observer.next(session);
        observer.complete();
      }).catch(error => {
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

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === currentSession.id);
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

      data.workoutSessions2[sessionIndex] = completedSession;
      
      this.dataService.saveData(data).then(() => {
        this.stopSessionTimer();
        this.currentSessionSubject.next(null);

        // Registrar progresso
        this.recordWorkoutProgress(completedSession);

        observer.next(completedSession);
        observer.complete();
      }).catch(error => {
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

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === currentSession.id);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

      const pausedSession = { ...currentSession, status: 'paused' as const };
      data.workoutSessions2[sessionIndex] = pausedSession;
      
      this.dataService.saveData(data).then(() => {
        this.stopSessionTimer();
        this.currentSessionSubject.next(pausedSession);
        observer.next(pausedSession);
        observer.complete();
      }).catch(error => {
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

      const sessionIndex = (data.workoutSessions2 || []).findIndex((s: WorkoutSession) => s.id === currentSession.id);
      if (sessionIndex === -1) {
        observer.error(new Error('Sessão não encontrada'));
        return;
      }

      const resumedSession = { ...currentSession, status: 'in-progress' as const };
      data.workoutSessions2[sessionIndex] = resumedSession;
      
      this.dataService.saveData(data).then(() => {
        this.startSessionTimer();
        this.currentSessionSubject.next(resumedSession);
        observer.next(resumedSession);
        observer.complete();
      }).catch(error => {
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
            .filter((s: WorkoutSession) => s.userId === user.id && s.status === 'completed')
            .sort((a: WorkoutSession, b: WorkoutSession) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );

          observer.next(sessions);
          observer.complete();
        },
        error: (error) => {
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
            .filter((p: WorkoutProgress) => p.exerciseId === exerciseId)
            .sort((a: WorkoutProgress, b: WorkoutProgress) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );

          observer.next(progress);
          observer.complete();
        },
        error: (error) => {
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
        personalRecord: false // TODO: calcular se é recorde
      };

      data.workoutProgress.push(progress);
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
}
