import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Workout } from '../models';
import { DataService } from './data.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  private workoutsSubject = new BehaviorSubject<Workout[]>([]);
  public workouts$ = this.workoutsSubject.asObservable();

  constructor(
    private dataService: DataService,
    private authService: AuthService
  ) {}  getWorkoutsByDay(dayId: string): Observable<Workout[]> {
    const data = this.dataService.getCurrentData();
    if (!data) return new Observable(observer => observer.next([]));
    
    const workouts = (data.workouts as Record<string, unknown>[])
      .filter((w: Record<string, unknown>) => w['dayId'] === dayId)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a['order'] as number) - (b['order'] as number));
    
    // Carregar exercícios para cada workout
    const workoutsWithExercises = workouts.map((workout: Record<string, unknown>) => {
      const exercises = (data.exercises as Record<string, unknown>[])
        .filter((e: Record<string, unknown>) => e['workoutId'] === workout['id'])
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a['order'] as number) - (b['order'] as number));
      
      // Carregar sets para cada exercício
      const exercisesWithSets = exercises.map((exercise: Record<string, unknown>) => ({
        ...exercise,
        sets: (data.sets as Record<string, unknown>[])
          .filter((s: Record<string, unknown>) => s['exerciseId'] === exercise['id'])
      }));

      return {
        ...workout,
        exercises: exercisesWithSets
      };
    });

    this.workoutsSubject.next(workoutsWithExercises as unknown as Workout[]);
    return new Observable(observer => {
      observer.next(workoutsWithExercises as unknown as Workout[]);
      observer.complete();
    });
  }  createWorkout(dayId: string, workoutData: Omit<Workout, 'id' | 'dayId' | 'exercises'>): Observable<Workout> {
    return new Observable<Workout>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não encontrados'));
        return;
      }
      
      // Verificar se o dia existe
      const day = (data.days as Record<string, unknown>[]).find((d: Record<string, unknown>) => d['id'] === dayId);
      if (!day) {
        observer.error(new Error('Dia não encontrado'));
        return;
      }

      const newWorkout: Workout = {
        ...workoutData,
        id: this.generateId(),
        dayId,
        exercises: []
      };

      (data.workouts as Record<string, unknown>[]).push(newWorkout as unknown as Record<string, unknown>);
      
      this.dataService.saveData(data).then(() => {
        // Atualizar lista local
        const currentWorkouts = this.workoutsSubject.value;
        this.workoutsSubject.next([...currentWorkouts, newWorkout]);
        observer.next(newWorkout);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar workout'));
      });
    });
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
