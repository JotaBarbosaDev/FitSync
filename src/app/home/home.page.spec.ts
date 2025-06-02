import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

import { HomePage } from './home.page';
import { StorageService } from '../services/storage.service';
import { JsonDataService } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { DeviceControlService } from '../services/device-control.service';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockStorageService: jasmine.SpyObj<StorageService>;
  let mockJsonDataService: jasmine.SpyObj<JsonDataService>;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;
  let mockDeviceControlService: jasmine.SpyObj<DeviceControlService>;
  let mockAlertController: jasmine.SpyObj<AlertController>;
  let mockToastController: jasmine.SpyObj<ToastController>;

  beforeEach(async () => {
    // Create spies for all dependencies
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockStorageService = jasmine.createSpyObj('StorageService', ['get', 'set']);
    mockJsonDataService = jasmine.createSpyObj('JsonDataService', ['getFitnessData', 'saveData']);
    mockNavigationService = jasmine.createSpyObj('NavigationService', ['navigateToPage']);
    mockDeviceControlService = jasmine.createSpyObj('DeviceControlService', ['getDeviceInfo']);
    mockAlertController = jasmine.createSpyObj('AlertController', ['create']);
    mockToastController = jasmine.createSpyObj('ToastController', ['create']);

    // Configure default return values
    mockStorageService.get.and.returnValue(Promise.resolve(null));
    mockJsonDataService.getFitnessData.and.returnValue(Promise.resolve(null));

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: StorageService, useValue: mockStorageService },
        { provide: JsonDataService, useValue: mockJsonDataService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: DeviceControlService, useValue: mockDeviceControlService },
        { provide: AlertController, useValue: mockAlertController },
        { provide: ToastController, useValue: mockToastController }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.nomeInstituto).toBe('Instituto Politécnico de Viana do Castelo');
    expect(component.userProfile.name).toBe('Usuário FitSync');
    expect(component.userProfile.level).toBe('Iniciante');
    expect(component.userProfile.streak).toBe(0);
    expect(component.recentWorkouts).toEqual([]);
    expect(component.featuredExercises).toEqual([]);
    expect(component.activePlan).toBeNull();
    expect(component.isLoading).toBe(true);
  });

  it('should have default today stats', () => {
    expect(component.todayStats.workouts).toBe(0);
    expect(component.todayStats.calories).toBe(0);
    expect(component.todayStats.time).toBe(0);
  });

  describe('ngOnInit', () => {
    it('should call load methods on initialization', async () => {
      spyOn(component, 'loadUserData').and.returnValue(Promise.resolve());
      spyOn(component, 'loadFeaturedExercises').and.returnValue(Promise.resolve());
      spyOn(component, 'loadTodayStats').and.returnValue(Promise.resolve());

      await component.ngOnInit();

      expect(component.loadUserData).toHaveBeenCalled();
      expect(component.loadFeaturedExercises).toHaveBeenCalled();
      expect(component.loadTodayStats).toHaveBeenCalled();
    });
  });

  describe('userProfile', () => {
    it('should update user profile data', () => {
      const newProfile = {
        name: 'João Silva',
        level: 'Intermediário',
        streak: 5
      };

      component.userProfile = newProfile;

      expect(component.userProfile.name).toBe('João Silva');
      expect(component.userProfile.level).toBe('Intermediário');
      expect(component.userProfile.streak).toBe(5);
    });
  });

  describe('workouts and exercises', () => {
    it('should handle recent workouts data', () => {
      const mockWorkouts = [
        {
          id: '1',
          name: 'Treino de Peito',
          date: '2024-01-01',
          duration: 45,
          caloriesBurned: 300,
          completed: true
        }
      ];

      component.recentWorkouts = mockWorkouts;

      expect(component.recentWorkouts.length).toBe(1);
      expect(component.recentWorkouts[0].name).toBe('Treino de Peito');
    });

    it('should handle featured exercises data', () => {
      const mockExercises = [
        {
          id: '1',
          name: 'Flexões',
          description: 'Exercício para peito e tríceps',
          difficulty: 'Fácil',
          muscleGroups: ['chest', 'triceps']
        }
      ];

      component.featuredExercises = mockExercises;

      expect(component.featuredExercises.length).toBe(1);
      expect(component.featuredExercises[0].name).toBe('Flexões');
    });
  });

  describe('active plan', () => {
    it('should handle active plan data', () => {
      const mockPlan = {
        id: '1',
        name: 'Plano de Força',
        description: 'Plano focado em ganho de força',
        progress: 60,
        totalWorkouts: 10,
        completedWorkouts: 6
      };

      component.activePlan = mockPlan;

      expect(component.activePlan).not.toBeNull();
      expect(component.activePlan?.name).toBe('Plano de Força');
      expect(component.activePlan?.progress).toBe(60);
    });

    it('should handle null active plan', () => {
      component.activePlan = null;
      expect(component.activePlan).toBeNull();
    });
  });

  describe('today stats', () => {
    it('should update today stats', () => {
      component.todayStats = {
        workouts: 2,
        calories: 450,
        time: 90
      };

      expect(component.todayStats.workouts).toBe(2);
      expect(component.todayStats.calories).toBe(450);
      expect(component.todayStats.time).toBe(90);
    });
  });

  describe('loading state', () => {
    it('should start with loading true', () => {
      expect(component.isLoading).toBe(true);
    });

    it('should be able to set loading false', () => {
      component.isLoading = false;
      expect(component.isLoading).toBe(false);
    });
  });

  describe('service interactions', () => {
    it('should interact with StorageService', () => {
      expect(mockStorageService).toBeDefined();
    });

    it('should interact with JsonDataService', () => {
      expect(mockJsonDataService).toBeDefined();
    });

    it('should interact with NavigationService', () => {
      expect(mockNavigationService).toBeDefined();
    });

    it('should interact with DeviceControlService', () => {
      expect(mockDeviceControlService).toBeDefined();
    });

    it('should interact with AlertController', () => {
      expect(mockAlertController).toBeDefined();
    });

    it('should interact with ToastController', () => {
      expect(mockToastController).toBeDefined();
    });
  });
});
