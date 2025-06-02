import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';

import { ProgressPage } from './progress.page';
import { ProgressDataService, WorkoutSession, Achievement, ProgressStats } from '../services/progress-data.service';

describe('ProgressPage', () => {
  let component: ProgressPage;
  let fixture: ComponentFixture<ProgressPage>;
  let mockProgressDataService: jasmine.SpyObj<ProgressDataService>;
  let mockRouter: jasmine.SpyObj<Router>;

  let workoutSessionsSubject: BehaviorSubject<WorkoutSession[]>;
  let achievementsSubject: BehaviorSubject<Achievement[]>;
  let progressStatsSubject: BehaviorSubject<ProgressStats | null>;

  const mockWorkoutSessions: WorkoutSession[] = [
    {
      id: 'session1',
      date: '2024-01-01',
      duration: 60,
      totalVolume: 5000,
      muscleGroups: ['chest', 'triceps'],
      exercises: [
        {
          exerciseId: 'supino',
          exerciseName: 'Supino Reto',
          muscleGroup: 'chest',
          sets: [
            { reps: 10, weight: 80, rpe: 8 },
            { reps: 8, weight: 85, rpe: 9 }
          ]
        }
      ]
    },
    {
      id: 'session2',
      date: '2024-01-03',
      duration: 45,
      totalVolume: 4500,
      muscleGroups: ['legs'],
      exercises: [
        {
          exerciseId: 'agachamento',
          exerciseName: 'Agachamento',
          muscleGroup: 'legs',
          sets: [
            { reps: 12, weight: 100, rpe: 7 },
            { reps: 10, weight: 105, rpe: 8 }
          ]
        }
      ]
    }
  ];

  const mockAchievements: Achievement[] = [
    {
      id: 'first_workout',
      title: 'Primeiro Treino',
      description: 'Complete seu primeiro treino',
      icon: 'fitness',
      category: 'milestone',
      dateEarned: '2024-01-01',
      isUnlocked: true
    },
    {
      id: 'streak_7',
      title: 'Dedicação Semanal',
      description: '7 dias consecutivos de treino',
      icon: 'calendar',
      category: 'consistency',
      dateEarned: '',
      isUnlocked: false
    }
  ];

  const mockProgressStats: ProgressStats = {
    totalWorkouts: 10,
    totalVolume: 50000,
    averageWorkoutDuration: 52.5,
    consistencyScore: 85,
    strongestExercise: 'supino',
    favoriteExercise: 'agachamento',
    currentStreak: 5,
    longestStreak: 7
  };

  beforeEach(async () => {
    // Create behavior subjects for observables
    workoutSessionsSubject = new BehaviorSubject<WorkoutSession[]>(mockWorkoutSessions);
    achievementsSubject = new BehaviorSubject<Achievement[]>(mockAchievements);
    progressStatsSubject = new BehaviorSubject<ProgressStats | null>(mockProgressStats);

    // Create spies for dependencies
    mockProgressDataService = jasmine.createSpyObj('ProgressDataService', ['init'], {
      workoutSessions$: workoutSessionsSubject.asObservable(),
      achievements$: achievementsSubject.asObservable(),
      progressStats$: progressStatsSubject.asObservable()
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Configure default return values
    mockProgressDataService.init.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      declarations: [ProgressPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: ProgressDataService, useValue: mockProgressDataService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.progressData).toEqual([]);
    expect(component.performanceMetrics).toBeNull();
    expect(component.achievements).toEqual([]);
    expect(component.filteredProgress).toEqual([]);
    expect(component.selectedTimeRange).toBe('30');
    expect(component.selectedMuscleGroup).toBe('all');
    expect(component.isLoading).toBe(true);
  });

  it('should have muscle groups configured', () => {
    expect(component.muscleGroups.length).toBe(8);
    expect(component.muscleGroups[0]).toEqual({ id: 'all', name: 'Todos', icon: 'apps-outline' });
    expect(component.muscleGroups.map(mg => mg.id)).toContain('chest');
    expect(component.muscleGroups.map(mg => mg.id)).toContain('legs');
  });

  it('should have time range options configured', () => {
    expect(component.timeRangeOptions.length).toBe(4);
    expect(component.timeRangeOptions[0]).toEqual({ value: '7', label: '7 dias' });
    expect(component.timeRangeOptions[1]).toEqual({ value: '30', label: '30 dias' });
  });

  it('should have chart configurations set up', () => {
    expect(component.volumeChartConfig.type).toBe('area');
    expect(component.volumeChartConfig.color).toBe('#3880ff');
    expect(component.strengthChartConfig.type).toBe('line');
    expect(component.strengthChartConfig.color).toBe('#10dc60');
  });

  describe('ngOnInit', () => {
    it('should call subscribe and load methods', () => {
      spyOn(component, 'subscribeToData' as any);
      spyOn(component, 'loadData' as any);

      component.ngOnInit();

      expect((component as any).subscribeToData).toHaveBeenCalled();
      expect((component as any).loadData).toHaveBeenCalled();
    });

    it('should set up subscriptions to data services', async () => {
      component.ngOnInit();

      expect(component.achievements).toEqual(mockAchievements);
      expect(component.performanceMetrics).toBeDefined();
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      component.ngOnInit();
      
      // Create spy on subscription unsubscribe
      const subscriptionSpy = jasmine.createSpyObj('Subscription', ['unsubscribe']);
      (component as any).subscriptions = [subscriptionSpy, subscriptionSpy];

      component.ngOnDestroy();

      expect(subscriptionSpy.unsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('data loading', () => {
    it('should load data and initialize service', async () => {
      await (component as any).loadData();

      expect(mockProgressDataService.init).toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    });

    it('should generate sample data when no sessions exist', async () => {
      spyOn(component, 'generateSampleData' as any);
      workoutSessionsSubject.next([]);

      await (component as any).loadData();

      expect((component as any).generateSampleData).toHaveBeenCalled();
    });

    it('should not generate sample data when sessions exist', async () => {
      spyOn(component, 'generateSampleData' as any);
      workoutSessionsSubject.next(mockWorkoutSessions);

      await (component as any).loadData();

      expect((component as any).generateSampleData).not.toHaveBeenCalled();
    });
  });

  describe('data subscriptions', () => {
    it('should update achievements when service emits', () => {
      component.ngOnInit();
      
      const newAchievements: Achievement[] = [
        ...mockAchievements,
        {
          id: 'new_achievement',
          title: 'New Achievement',
          description: 'A new achievement',
          icon: 'trophy',
          category: 'milestone',
          dateEarned: '2024-01-05',
          isUnlocked: true
        }
      ];

      achievementsSubject.next(newAchievements);

      expect(component.achievements).toEqual(newAchievements);
    });

    it('should update performance metrics when stats change', () => {
      component.ngOnInit();
      
      const newStats: ProgressStats = {
        ...mockProgressStats,
        totalWorkouts: 15,
        currentStreak: 8
      };

      progressStatsSubject.next(newStats);

      expect(component.performanceMetrics).toBeDefined();
      expect(component.performanceMetrics?.totalWorkouts).toBe(15);
    });

    it('should handle null progress stats', () => {
      component.ngOnInit();
      
      progressStatsSubject.next(null);

      // Should not throw error and component should remain stable
      expect(component.performanceMetrics).toBeDefined(); // From initial load
    });
  });

  describe('progress data updates', () => {
    it('should update progress data when workout sessions change', () => {
      spyOn(component, 'updateProgressData' as any);
      
      component.ngOnInit();
      
      const newSessions = [...mockWorkoutSessions];
      workoutSessionsSubject.next(newSessions);

      expect((component as any).updateProgressData).toHaveBeenCalledWith(newSessions);
    });

    it('should update performance metrics when stats change', () => {
      spyOn(component, 'updatePerformanceMetrics' as any);
      
      component.ngOnInit();
      
      progressStatsSubject.next(mockProgressStats);

      expect((component as any).updatePerformanceMetrics).toHaveBeenCalledWith(mockProgressStats);
    });
  });

  describe('filtering and selection', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update selected time range', () => {
      component.selectedTimeRange = '7';
      expect(component.selectedTimeRange).toBe('7');
    });

    it('should update selected muscle group', () => {
      component.selectedMuscleGroup = 'chest';
      expect(component.selectedMuscleGroup).toBe('chest');
    });

    it('should filter progress data by muscle group', () => {
      // This would test the filtering logic if it exists in the component
      component.selectedMuscleGroup = 'chest';
      // Add test for filtering logic when implemented
    });

    it('should filter progress data by time range', () => {
      // This would test the time range filtering logic if it exists
      component.selectedTimeRange = '7';
      // Add test for time filtering logic when implemented
    });
  });

  describe('component state management', () => {
    it('should maintain loading state correctly', async () => {
      expect(component.isLoading).toBe(true);
      
      await (component as any).loadData();
      
      expect(component.isLoading).toBe(false);
    });

    it('should maintain subscription array', () => {
      component.ngOnInit();
      expect((component as any).subscriptions.length).toBeGreaterThan(0);
    });

    it('should have router instance', () => {
      expect(component.router).toBe(mockRouter);
    });
  });

  describe('sample data generation', () => {
    it('should generate sample data when called', async () => {
      spyOn(mockProgressDataService, 'addWorkoutSession').and.returnValue(Promise.resolve('sessionId'));
      
      await (component as any).generateSampleData();
      
      // Should have called addWorkoutSession multiple times for sample data
      expect(mockProgressDataService.addWorkoutSession).toHaveBeenCalled();
    });
  });
});
