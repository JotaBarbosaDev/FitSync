import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Workout, Exercise, Day, Set } from '../models';
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
    
    const workouts = data.workouts
      .filter((w: Workout) => w.dayId === dayId)
      .sort((a: Workout, b: Workout) => a.order - b.order);
    
    // Carregar exercícios para cada workout
    const workoutsWithExercises = workouts.map((workout: Workout) => {
      const exercises = data.exercises
        .filter((e: Exercise) => e.workoutId === workout.id)
        .sort((a: Exercise, b: Exercise) => a.order - b.order);
      
      // Carregar sets para cada exercício
      const exercisesWithSets = exercises.map((exercise: Exercise) => ({
        ...exercise,
        sets: data.sets
          .filter((s: Set) => s.exerciseId === exercise.id)
      }));

      return {
        ...workout,
        exercises: exercisesWithSets
      };
    });

    this.workoutsSubject.next(workoutsWithExercises);
    return new Observable(observer => {
      observer.next(workoutsWithExercises);
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
      const day = data.days.find((d: Day) => d.id === dayId);
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

      data.workouts.push(newWorkout);
      
      this.dataService.saveData(data).then(success => {
        if (success) {
          // Atualizar lista local
          const currentWorkouts = this.workoutsSubject.value;
          this.workoutsSubject.next([...currentWorkouts, newWorkout]);
          observer.next(newWorkout);
          observer.complete();
        } else {
          observer.error(new Error('Erro ao salvar workout'));
        }
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
