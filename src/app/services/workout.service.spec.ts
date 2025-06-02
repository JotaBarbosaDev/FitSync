import { TestBed } from '@angular/core/testing';
import { WorkoutService } from './workout.service';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { Workout, Exercise, Day, Set, User, AppData } from '../models';
import { BehaviorSubject, of } from 'rxjs';

describe('WorkoutService', () => {
  let service: WorkoutService;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    fitnessLevel: 'intermediate',
    goals: ['strength'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockSet: Set = {
    id: 'set1',
    exerciseId: 'exercise1',
    type: 'normal',
    reps: 12,
    weight: 60,
    restTime: 90,
    completed: false
  };

  const mockExercise: Exercise = {
    id: 'exercise1',
    workoutId: 'workout1',
    name: 'Supino Reto',
    category: 'chest',
    sets: [mockSet],
    equipment: ['barbell'],
    muscleGroups: ['chest', 'triceps'],
    order: 1
  };

  const mockWorkout: Workout = {
    id: 'workout1',
    dayId: 'day1',
    name: 'Treino A',
    type: 'strength',
    estimatedDuration: 60,
    exercises: [mockExercise],
    restBetweenExercises: 90,
    order: 1,
    completed: false
  };

  const mockDay: Day = {
    id: 'day1',
    planId: 'plan1',
    name: 'Peito e Tríceps',
    dayOfWeek: 1,
    order: 1,
    workouts: [mockWorkout],
    isRestDay: false
  };

  const mockAppData: AppData = {
    version: '1.0.0',
    lastUpdated: '2024-01-01T00:00:00.000Z',
    plans: [],
    days: [mockDay],
    workouts: [mockWorkout],
    exercises: [mockExercise],
    sets: [mockSet],
    workoutSessions: [],
    users: [mockUser],
    exerciseLibrary: []
  };

  beforeEach(() => {
    const dataService = jasmine.createSpyObj('DataService', ['saveData', 'getCurrentData'], {
      data$: new BehaviorSubject<AppData | null>(mockAppData)
    });
    const authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    TestBed.configureTestingModule({
      providers: [
        WorkoutService,
        { provide: DataService, useValue: dataService },
        { provide: AuthService, useValue: authService }
      ]
    });

    service = TestBed.inject(WorkoutService);
    dataServiceSpy = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    // Configurar mocks padrão
    authServiceSpy.getCurrentUser.and.returnValue(of(mockUser));
    dataServiceSpy.getCurrentData.and.returnValue(mockAppData);
    dataServiceSpy.saveData.and.returnValue(Promise.resolve(true));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getWorkoutsByDay', () => {
    it('should return workouts for a specific day with exercises and sets', (done) => {
      service.getWorkoutsByDay('day1').subscribe(workouts => {
        expect(workouts).toBeDefined();
        expect(workouts.length).toBe(1);
        expect(workouts[0].id).toBe('workout1');
        expect(workouts[0].exercises).toBeDefined();
        expect(workouts[0].exercises.length).toBe(1);
        expect(workouts[0].exercises[0].sets).toBeDefined();
        expect(workouts[0].exercises[0].sets.length).toBe(1);
        done();
      });
    });

    it('should return empty array when no data available', (done) => {
      dataServiceSpy.getCurrentData.and.returnValue(null);

      service.getWorkoutsByDay('day1').subscribe(workouts => {
        expect(workouts).toEqual([]);
        done();
      });
    });

    it('should return empty array when no workouts for day', (done) => {
      service.getWorkoutsByDay('nonexistent-day').subscribe(workouts => {
        expect(workouts).toEqual([]);
        done();
      });
    });

    it('should sort workouts by order', (done) => {
      const workout2: Workout = {
        ...mockWorkout,
        id: 'workout2',
        name: 'Treino B',
        order: 0,
        exercises: []
      };

      const dataWithMultipleWorkouts = {
        ...mockAppData,
        workouts: [mockWorkout, workout2]
      };
      dataServiceSpy.getCurrentData.and.returnValue(dataWithMultipleWorkouts);

      service.getWorkoutsByDay('day1').subscribe(workouts => {
        expect(workouts.length).toBe(2);
        expect(workouts[0].id).toBe('workout2'); // order 0 vem primeiro
        expect(workouts[1].id).toBe('workout1'); // order 1 vem depois
        done();
      });
    });

    it('should sort exercises by order within workouts', (done) => {
      const exercise2: Exercise = {
        ...mockExercise,
        id: 'exercise2',
        name: 'Incline Press',
        order: 0
      };

      const dataWithMultipleExercises = {
        ...mockAppData,
        exercises: [mockExercise, exercise2]
      };
      dataServiceSpy.getCurrentData.and.returnValue(dataWithMultipleExercises);

      service.getWorkoutsByDay('day1').subscribe(workouts => {
        expect(workouts[0].exercises.length).toBe(2);
        expect(workouts[0].exercises[0].id).toBe('exercise2'); // order 0
        expect(workouts[0].exercises[1].id).toBe('exercise1'); // order 1
        done();
      });
    });
  });

  describe('createWorkout', () => {
    const newWorkoutData = {
      name: 'Novo Treino',
      type: 'strength' as const,
      estimatedDuration: 45,
      restBetweenExercises: 60,
      order: 2,
      completed: false
    };

    it('should create a new workout successfully', (done) => {
      service.createWorkout('day1', newWorkoutData).subscribe(workout => {
        expect(workout).toBeDefined();
        expect(workout.name).toBe(newWorkoutData.name);
        expect(workout.dayId).toBe('day1');
        expect(workout.exercises).toEqual([]);
        expect(workout.id).toContain('id_');
        expect(dataServiceSpy.saveData).toHaveBeenCalled();
        done();
      });
    });

    it('should throw error when data not found', (done) => {
      dataServiceSpy.getCurrentData.and.returnValue(null);

      service.createWorkout('day1', newWorkoutData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Dados não encontrados');
          done();
        }
      });
    });

    it('should throw error when day not found', (done) => {
      service.createWorkout('nonexistent-day', newWorkoutData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Dia não encontrado');
          done();
        }
      });
    });

    it('should throw error when save fails', (done) => {
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(false));

      service.createWorkout('day1', newWorkoutData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Erro ao salvar workout');
          done();
        }
      });
    });

    it('should throw error when save throws exception', (done) => {
      dataServiceSpy.saveData.and.returnValue(Promise.reject(new Error('Save error')));

      service.createWorkout('day1', newWorkoutData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Save error');
          done();
        }
      });
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      // Acessar método privado para teste
      const generateId = (service as any).generateId;
      const id1 = generateId.call(service);
      const id2 = generateId.call(service);
      
      expect(id1).toContain('id_');
      expect(id2).toContain('id_');
      expect(id1).not.toBe(id2);
    });
  });
});
