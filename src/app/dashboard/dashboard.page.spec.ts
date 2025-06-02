import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, AlertController, MenuController } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';

import { DashboardPage } from './dashboard.page';
import { AuthService } from '../services/auth.service';
import { PlanService } from '../services/plan.service';
import { TimerService } from '../services/timer.service';
import { User, Plan, WorkoutTimer } from '../models';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockPlanService: jasmine.SpyObj<PlanService>;
  let mockTimerService: jasmine.SpyObj<TimerService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAlertController: jasmine.SpyObj<AlertController>;
  let mockMenuController: jasmine.SpyObj<MenuController>;
  let mockAlert: jasmine.SpyObj<any>;

  let currentUserSubject: BehaviorSubject<User | null>;
  let plansSubject: BehaviorSubject<Plan[]>;
  let workoutTimerSubject: BehaviorSubject<WorkoutTimer>;

  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    height: 175,
    weight: 70,
    fitnessLevel: 'beginner',
    goals: ['lose_weight'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPlan: Plan = {
    id: 'plan1',
    name: 'Test Plan',
    description: 'Test Description',
    userId: 'user1',
    duration: 4,
    difficulty: 'beginner',
    goals: ['weight_loss'],
    days: [],
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };

  const mockWorkoutTimer: WorkoutTimer = {
    totalTime: 0,
    isRunning: false,
    isPaused: false
  };

  beforeEach(async () => {
    // Create behavior subjects for observables
    currentUserSubject = new BehaviorSubject<User | null>(mockUser);
    plansSubject = new BehaviorSubject<Plan[]>([mockPlan]);
    workoutTimerSubject = new BehaviorSubject<WorkoutTimer>(mockWorkoutTimer);

    // Create spies for dependencies
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'logout']);
    mockPlanService = jasmine.createSpyObj('PlanService', ['getPlans', 'getActivePlan']);
    mockTimerService = jasmine.createSpyObj('TimerService', [], {
      workoutTimer$: workoutTimerSubject.asObservable()
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAlert = jasmine.createSpyObj('Alert', ['present']);
    mockAlertController = jasmine.createSpyObj('AlertController', ['create']);
    mockMenuController = jasmine.createSpyObj('MenuController', ['enable', 'open']);

    // Configure default return values
    mockAuthService.getCurrentUser.and.returnValue(currentUserSubject.asObservable());
    mockPlanService.getPlans.and.returnValue(plansSubject.asObservable());
    mockPlanService.getActivePlan.and.returnValue(mockPlan);
    mockAlertController.create.and.returnValue(Promise.resolve(mockAlert));

    await TestBed.configureTestingModule({
      declarations: [DashboardPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: PlanService, useValue: mockPlanService },
        { provide: TimerService, useValue: mockTimerService },
        { provide: Router, useValue: mockRouter },
        { provide: AlertController, useValue: mockAlertController },
        { provide: MenuController, useValue: mockMenuController }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.currentUser).toBeNull();
    expect(component.activePlan).toBeNull();
    expect(component.plans).toEqual([]);
    expect(component.workoutTimer).toEqual({ totalTime: 0, isRunning: false, isPaused: false });
    expect(component.recentWorkouts).toEqual([]);
  });

  describe('ngOnInit', () => {
    it('should call initialization methods', () => {
      spyOn(component, 'loadUserData' as any);
      spyOn(component, 'loadPlans' as any);
      spyOn(component, 'setupSubscriptions' as any);

      component.ngOnInit();

      expect((component as any).loadUserData).toHaveBeenCalled();
      expect((component as any).loadPlans).toHaveBeenCalled();
      expect((component as any).setupSubscriptions).toHaveBeenCalled();
    });

    it('should load user data and set current user', async () => {
      component.ngOnInit();

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(component.currentUser).toEqual(mockUser);
    });

    it('should navigate to login if no user', async () => {
      currentUserSubject.next(null);
      component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should load plans and set active plan', async () => {
      component.ngOnInit();

      expect(mockPlanService.getPlans).toHaveBeenCalled();
      expect(mockPlanService.getActivePlan).toHaveBeenCalled();
      expect(component.plans).toEqual([mockPlan]);
      expect(component.activePlan).toEqual(mockPlan);
    });

    it('should setup timer subscription', async () => {
      const newTimer: WorkoutTimer = { totalTime: 300, isRunning: true, isPaused: false };
      
      component.ngOnInit();
      workoutTimerSubject.next(newTimer);

      expect(component.workoutTimer).toEqual(newTimer);
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

  describe('ionViewWillEnter', () => {
    it('should enable menu', () => {
      component.ionViewWillEnter();
      expect(mockMenuController.enable).toHaveBeenCalledWith(true);
    });
  });

  describe('error handling', () => {
    it('should handle user data loading error', () => {
      spyOn(console, 'error');
      mockAuthService.getCurrentUser.and.returnValue(
        new BehaviorSubject(null).asObservable()
      );

      // Simulate error by throwing in subscription
      const errorSub = new BehaviorSubject<User | null>(null);
      mockAuthService.getCurrentUser.and.returnValue(errorSub.asObservable());
      
      component.ngOnInit();
      
      // Simulate error
      errorSub.error(new Error('Test error'));

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('logout', () => {
    it('should show confirmation alert and logout on confirm', async () => {
      const alertButtons = [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sair', handler: jasmine.createSpy('handler') }
      ];
      
      mockAlertController.create.and.returnValue(Promise.resolve({
        ...mockAlert,
        buttons: alertButtons
      } as any));

      await component.logout();

      expect(mockAlertController.create).toHaveBeenCalledWith({
        header: 'Confirmar Logout',
        message: 'Tem certeza que deseja sair?',
        buttons: jasmine.any(Array)
      });
      expect(mockAlert.present).toHaveBeenCalled();

      // Simulate clicking the logout button
      const logoutButton = alertButtons.find(b => b.text === 'Sair');
      if (logoutButton && logoutButton.handler) {
        (logoutButton.handler as jasmine.Spy)();
        expect(mockAuthService.logout).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
      }
    });
  });

  describe('navigation methods', () => {
    it('should open menu', () => {
      component.openMenu();
      expect(mockMenuController.open).toHaveBeenCalled();
    });

    it('should navigate to plans', () => {
      component.navigateToPlans();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/lista']);
    });

    it('should navigate to workout if active plan exists', () => {
      component.activePlan = mockPlan;
      component.navigateToWorkout();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/detalhe']);
    });

    it('should show create plan alert if no active plan', async () => {
      component.activePlan = null;
      spyOn(component, 'showCreatePlanAlert' as any);
      
      component.navigateToWorkout();
      
      expect((component as any).showCreatePlanAlert).toHaveBeenCalled();
    });

    it('should navigate to profile', () => {
      component.navigateToProfile();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/dashboard']);
    });
  });

  describe('createQuickPlan', () => {
    it('should show development alert', async () => {
      await component.createQuickPlan();

      expect(mockAlertController.create).toHaveBeenCalledWith({
        header: 'Criar Plano Rápido',
        message: 'Funcionalidade em desenvolvimento. Por enquanto, use a criação de planos personalizada.',
        buttons: ['OK']
      });
      expect(mockAlert.present).toHaveBeenCalled();
    });
  });

  describe('showCreatePlanAlert', () => {
    it('should show create plan alert with navigation options', async () => {
      await (component as any).showCreatePlanAlert();

      expect(mockAlertController.create).toHaveBeenCalledWith({
        header: 'Nenhum Plano Ativo',
        message: 'Você precisa criar ou ativar um plano antes de começar a treinar.',
        buttons: jasmine.any(Array)
      });
      expect(mockAlert.present).toHaveBeenCalled();
    });
  });

  describe('component state management', () => {
    it('should maintain subscription array', () => {
      component.ngOnInit();
      expect((component as any).subscriptions.length).toBeGreaterThan(0);
    });

    it('should update workout timer when service emits', () => {
      const newTimer: WorkoutTimer = { totalTime: 600, isRunning: true, isPaused: true };
      
      component.ngOnInit();
      workoutTimerSubject.next(newTimer);

      expect(component.workoutTimer).toEqual(newTimer);
    });

    it('should update plans when service emits', () => {
      const newPlans: Plan[] = [
        { ...mockPlan, id: 'plan2', name: 'Second Plan' }
      ];
      
      component.ngOnInit();
      plansSubject.next(newPlans);

      expect(component.plans).toEqual(newPlans);
    });
  });
});
