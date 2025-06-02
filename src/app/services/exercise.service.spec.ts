import { TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { ExerciseService, ExerciseLibraryItem } from './exercise.service';
import { DataService } from './data.service';

describe('ExerciseService', () => {
  let service: ExerciseService;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let mockExerciseLibrary: ExerciseLibraryItem[];
  let mockAppData: any;

  beforeEach(() => {
    // Mock exercise library data
    mockExerciseLibrary = [
      {
        id: 'ex-1',
        name: 'Push-ups',
        category: 'chest',
        muscleGroups: ['chest', 'triceps', 'shoulders'],
        equipment: ['bodyweight'],
        instructions: 'Lower your body until your chest touches the floor',
        difficulty: 'beginner'
      },
      {
        id: 'ex-2',
        name: 'Squats',
        category: 'legs',
        muscleGroups: ['quadriceps', 'glutes'],
        equipment: ['bodyweight'],
        instructions: 'Lower your body by bending your knees',
        difficulty: 'beginner'
      },
      {
        id: 'ex-3',
        name: 'Deadlift',
        category: 'back',
        muscleGroups: ['back', 'glutes', 'hamstrings'],
        equipment: ['barbell'],
        instructions: 'Lift the barbell from the ground',
        difficulty: 'advanced'
      }
    ];

    // Mock app data
    mockAppData = {
      version: '1.0.0',
      lastUpdated: '2025-01-01T00:00:00.000Z',
      users: [],
      plans: [],
      days: [],
      workouts: [],
      exercises: [],
      sets: [],
      workoutSessions: [],
      exerciseLibrary: mockExerciseLibrary
    };

    // Create spy for DataService
    const spy = jasmine.createSpyObj('DataService', ['saveData', 'getCurrentData'], {
      data$: new BehaviorSubject(mockAppData)
    });

    TestBed.configureTestingModule({
      providers: [
        ExerciseService,
        { provide: DataService, useValue: spy }
      ]
    });

    service = TestBed.inject(ExerciseService);
    dataServiceSpy = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getExerciseLibrary', () => {
    it('should return exercise library observable', (done) => {
      service.getExerciseLibrary().subscribe(exercises => {
        expect(exercises).toEqual(mockExerciseLibrary);
        expect(exercises.length).toBe(3);
        done();
      });
    });
  });

  describe('getExercisesByCategory', () => {
    it('should return exercises filtered by category', () => {
      const chestExercises = service.getExercisesByCategory('chest');
      expect(chestExercises.length).toBe(1);
      expect(chestExercises[0].name).toBe('Push-ups');
    });

    it('should return empty array for non-existent category', () => {
      const cardioExercises = service.getExercisesByCategory('cardio');
      expect(cardioExercises.length).toBe(0);
    });
  });

  describe('getExercisesByMuscleGroup', () => {
    it('should return exercises that target specific muscle group', () => {
      const chestExercises = service.getExercisesByMuscleGroup('chest');
      expect(chestExercises.length).toBe(1);
      expect(chestExercises[0].name).toBe('Push-ups');
    });

    it('should return exercises that target glutes', () => {
      const gluteExercises = service.getExercisesByMuscleGroup('glutes');
      expect(gluteExercises.length).toBe(2);
      expect(gluteExercises.map(ex => ex.name)).toContain('Squats');
      expect(gluteExercises.map(ex => ex.name)).toContain('Deadlift');
    });

    it('should return empty array for non-targeted muscle group', () => {
      const bicepsExercises = service.getExercisesByMuscleGroup('biceps');
      expect(bicepsExercises.length).toBe(0);
    });
  });

  describe('getExercisesByEquipment', () => {
    it('should return bodyweight exercises', () => {
      const bodyweightExercises = service.getExercisesByEquipment('bodyweight');
      expect(bodyweightExercises.length).toBe(2);
      expect(bodyweightExercises.map(ex => ex.name)).toContain('Push-ups');
      expect(bodyweightExercises.map(ex => ex.name)).toContain('Squats');
    });

    it('should return barbell exercises', () => {
      const barbellExercises = service.getExercisesByEquipment('barbell');
      expect(barbellExercises.length).toBe(1);
      expect(barbellExercises[0].name).toBe('Deadlift');
    });

    it('should return empty array for non-existent equipment', () => {
      const dumbbellExercises = service.getExercisesByEquipment('dumbbell');
      expect(dumbbellExercises.length).toBe(0);
    });
  });

  describe('searchExercises', () => {
    it('should find exercises by name', () => {
      const results = service.searchExercises('push');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Push-ups');
    });

    it('should find exercises by muscle group', () => {
      const results = service.searchExercises('chest');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Push-ups');
    });

    it('should find exercises by category', () => {
      const results = service.searchExercises('legs');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Squats');
    });

    it('should be case insensitive', () => {
      const results = service.searchExercises('PUSH');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Push-ups');
    });

    it('should return empty array for no matches', () => {
      const results = service.searchExercises('nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('getExerciseById', () => {
    it('should return exercise by id', () => {
      const exercise = service.getExerciseById('ex-1');
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Push-ups');
    });

    it('should return undefined for non-existent id', () => {
      const exercise = service.getExerciseById('non-existent');
      expect(exercise).toBeUndefined();
    });
  });

  describe('addCustomExercise', () => {
    it('should successfully add custom exercise', (done) => {
      const newExercise = {
        name: 'Burpees',
        category: 'cardio' as const,
        muscleGroups: ['full-body'],
        equipment: ['bodyweight'],
        instructions: 'Jump down, push-up, jump up',
        difficulty: 'intermediate' as const
      };

      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(true));

      service.addCustomExercise(newExercise).subscribe({
        next: (exercise) => {
          expect(exercise.name).toBe(newExercise.name);
          expect(exercise.category).toBe(newExercise.category);
          expect(exercise.id).toBeDefined();
          expect(dataServiceSpy.saveData).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('should throw error when data is not loaded', (done) => {
      const newExercise = {
        name: 'Test Exercise',
        category: 'chest' as const,
        muscleGroups: ['chest'],
        equipment: ['bodyweight'],
        instructions: 'Test instructions',
        difficulty: 'beginner' as const
      };

      dataServiceSpy.getCurrentData.and.returnValue(null);

      service.addCustomExercise(newExercise).subscribe({
        next: () => done.fail('Expected error for unloaded data'),
        error: (error) => {
          expect(error.message).toBe('Dados não carregados');
          done();
        }
      });
    });

    it('should handle save failure', (done) => {
      const newExercise = {
        name: 'Test Exercise',
        category: 'chest' as const,
        muscleGroups: ['chest'],
        equipment: ['bodyweight'],
        instructions: 'Test instructions',
        difficulty: 'beginner' as const
      };

      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(false));

      service.addCustomExercise(newExercise).subscribe({
        next: () => done.fail('Expected error for save failure'),
        error: (error) => {
          expect(error.message).toBe('Erro ao salvar exercício');
          done();
        }
      });
    });
  });

  describe('updateCustomExercise', () => {
    it('should successfully update existing exercise', (done) => {
      const updates = {
        name: 'Modified Push-ups',
        difficulty: 'intermediate' as const
      };

      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(true));

      service.updateCustomExercise('ex-1', updates).subscribe({
        next: (exercise) => {
          expect(exercise.name).toBe(updates.name);
          expect(exercise.difficulty).toBe(updates.difficulty);
          expect(exercise.category).toBe('chest'); // Should keep original value
          expect(dataServiceSpy.saveData).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('should throw error for non-existent exercise', (done) => {
      const updates = { name: 'Updated Name' };

      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);

      service.updateCustomExercise('non-existent', updates).subscribe({
        next: () => done.fail('Expected error for non-existent exercise'),
        error: (error) => {
          expect(error.message).toBe('Exercício não encontrado');
          done();
        }
      });
    });
  });

  describe('deleteCustomExercise', () => {
    it('should successfully delete existing exercise', (done) => {
      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(true));

      service.deleteCustomExercise('ex-1').subscribe({
        next: (success) => {
          expect(success).toBe(true);
          expect(dataServiceSpy.saveData).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('should throw error for non-existent exercise', (done) => {
      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);

      service.deleteCustomExercise('non-existent').subscribe({
        next: () => done.fail('Expected error for non-existent exercise'),
        error: (error) => {
          expect(error.message).toBe('Exercício não encontrado');
          done();
        }
      });
    });
  });
});
