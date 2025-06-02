import { TestBed } from '@angular/core/testing';
import { PlanService } from './plan.service';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { Plan, Day, Workout, Exercise, User, AppData } from '../models';
import { BehaviorSubject, of, throwError } from 'rxjs';

describe('PlanService', () => {
  let service: PlanService;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  
  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    fitnessLevel: 'intermediate',
    goals: ['strength', 'muscle_gain'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockPlan: Plan = {
    id: 'plan1',
    userId: 'user1',
    name: 'Treino de Força',
    description: 'Plano focado em ganho de força',
    duration: 12,
    difficulty: 'intermediate',
    goals: ['strength'],
    days: [],
    isActive: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const mockDay: Day = {
    id: 'day1',
    planId: 'plan1',
    name: 'Peito e Tríceps',
    dayOfWeek: 1,
    order: 1,
    workouts: [],
    isRestDay: false
  };

  const mockWorkout: Workout = {
    id: 'workout1',
    dayId: 'day1',
    name: 'Treino A',
    type: 'strength',
    estimatedDuration: 60,
    exercises: [],
    restBetweenExercises: 90,
    order: 1,
    completed: false
  };

  const mockExercise: Exercise = {
    id: 'exercise1',
    workoutId: 'workout1',
    name: 'Supino Reto',
    category: 'chest',
    sets: [],
    equipment: ['barbell'],
    muscleGroups: ['chest', 'triceps'],
    order: 1
  };

  const mockAppData: AppData = {
    version: '1.0.0',
    lastUpdated: '2024-01-01T00:00:00.000Z',
    plans: [mockPlan],
    days: [mockDay],
    workouts: [mockWorkout],
    exercises: [mockExercise],
    sets: [],
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
        PlanService,
        { provide: DataService, useValue: dataService },
        { provide: AuthService, useValue: authService }
      ]
    });

    service = TestBed.inject(PlanService);
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

  describe('getPlans', () => {
    it('should return observable of plans', (done) => {
      service.getPlans().subscribe(plans => {
        expect(plans).toEqual([mockPlan]);
        done();
      });
    });

    it('should filter plans by current user', (done) => {
      const otherUserPlan: Plan = {
        ...mockPlan,
        id: 'plan2',
        userId: 'user2'
      };
      const dataWithMultiplePlans = {
        ...mockAppData,
        plans: [mockPlan, otherUserPlan]
      };
      (dataServiceSpy.data$ as BehaviorSubject<AppData | null>).next(dataWithMultiplePlans);

      service.getPlans().subscribe(plans => {
        expect(plans).toEqual([mockPlan]);
        expect(plans.every(plan => plan.userId === mockUser.id)).toBe(true);
        done();
      });
    });
  });

  describe('createPlan', () => {
    const newPlanData = {
      name: 'Novo Plano',
      description: 'Descrição do novo plano',
      duration: 8,
      difficulty: 'beginner' as const,
      goals: ['weight_loss'],
      days: [],
      isActive: false
    };

    it('should create a new plan successfully', (done) => {
      service.createPlan(newPlanData).subscribe(plan => {
        expect(plan).toBeDefined();
        expect(plan.name).toBe(newPlanData.name);
        expect(plan.userId).toBe(mockUser.id);
        expect(plan.id).toContain('plan_');
        expect(plan.createdAt).toBeDefined();
        expect(plan.updatedAt).toBeDefined();
        expect(dataServiceSpy.saveData).toHaveBeenCalled();
        done();
      });
    });

    it('should throw error when user not authenticated', (done) => {
      authServiceSpy.getCurrentUser.and.returnValue(of(null));

      service.createPlan(newPlanData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Usuário não autenticado');
          done();
        }
      });
    });

    it('should throw error when data not found', (done) => {
      (dataServiceSpy.data$ as BehaviorSubject<AppData | null>).next(null);

      service.createPlan(newPlanData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Dados não encontrados');
          done();
        }
      });
    });

    it('should throw error when save fails', (done) => {
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(false));

      service.createPlan(newPlanData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Erro ao salvar plano');
          done();
        }
      });
    });

    it('should throw error when save throws exception', (done) => {
      dataServiceSpy.saveData.and.returnValue(Promise.reject(new Error('Save error')));

      service.createPlan(newPlanData).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Save error');
          done();
        }
      });
    });
  });

  describe('updatePlan', () => {
    const updates = {
      name: 'Plano Atualizado',
      description: 'Nova descrição'
    };

    it('should update plan successfully', (done) => {
      service.updatePlan('plan1', updates).subscribe(updatedPlan => {
        expect(updatedPlan.name).toBe(updates.name);
        expect(updatedPlan.description).toBe(updates.description);
        expect(updatedPlan.updatedAt).toBeDefined();
        expect(dataServiceSpy.saveData).toHaveBeenCalled();
        done();
      });
    });

    it('should throw error when data not loaded', (done) => {
      dataServiceSpy.getCurrentData.and.returnValue(null);

      service.updatePlan('plan1', updates).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Dados não carregados');
          done();
        }
      });
    });

    it('should throw error when plan not found', (done) => {
      service.updatePlan('nonexistent', updates).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Plano não encontrado');
          done();
        }
      });
    });

    it('should throw error when save fails', (done) => {
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(false));

      service.updatePlan('plan1', updates).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Erro ao salvar plano');
          done();
        }
      });
    });
  });

  describe('deletePlan', () => {
    it('should delete plan and associated data successfully', (done) => {
      service.deletePlan('plan1').subscribe(() => {
        expect(dataServiceSpy.saveData).toHaveBeenCalled();
        done();
      });
    });

    it('should throw error when data not loaded', (done) => {
      dataServiceSpy.getCurrentData.and.returnValue(null);

      service.deletePlan('plan1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Dados não carregados');
          done();
        }
      });
    });

    it('should throw error when save fails', (done) => {
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(false));

      service.deletePlan('plan1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Erro ao deletar plano');
          done();
        }
      });
    });

    it('should throw error when save throws exception', (done) => {
      dataServiceSpy.saveData.and.returnValue(Promise.reject(new Error('Delete error')));

      service.deletePlan('plan1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Delete error');
          done();
        }
      });
    });
  });

  describe('getPlanDetails', () => {
    it('should return plan details successfully', (done) => {
      service.getPlanDetails('plan1').subscribe(details => {
        expect(details.plan).toEqual(mockPlan);
        expect(details.days).toEqual([mockDay]);
        expect(details.workouts).toEqual([mockWorkout]);
        expect(details.exercises).toEqual([mockExercise]);
        done();
      });
    });

    it('should throw error when data not loaded', (done) => {
      dataServiceSpy.getCurrentData.and.returnValue(null);

      service.getPlanDetails('plan1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Dados não carregados');
          done();
        }
      });
    });

    it('should throw error when plan not found', (done) => {
      service.getPlanDetails('nonexistent').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Plano não encontrado');
          done();
        }
      });
    });
  });

  describe('setActivePlan', () => {
    it('should set active plan successfully', (done) => {
      service.setActivePlan('plan1').subscribe(() => {
        expect(dataServiceSpy.saveData).toHaveBeenCalled();
        done();
      });
    });

    it('should throw error when data not loaded', (done) => {
      dataServiceSpy.getCurrentData.and.returnValue(null);

      service.setActivePlan('plan1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Dados não carregados');
          done();
        }
      });
    });

    it('should throw error when user not authenticated', (done) => {
      authServiceSpy.getCurrentUser.and.returnValue(of(null));

      service.setActivePlan('plan1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Usuário não autenticado');
          done();
        }
      });
    });

    it('should throw error when save fails', (done) => {
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(false));

      service.setActivePlan('plan1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Erro ao ativar plano');
          done();
        }
      });
    });

    it('should handle auth service error', (done) => {
      authServiceSpy.getCurrentUser.and.returnValue(throwError(() => new Error('Auth error')));

      service.setActivePlan('plan1').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toBe('Auth error');
          done();
        }
      });
    });
  });

  describe('getActivePlan', () => {
    it('should return active plan when exists', () => {
      const activePlan = { ...mockPlan, isActive: true };
      (dataServiceSpy.data$ as BehaviorSubject<AppData | null>).next({
        ...mockAppData,
        plans: [activePlan]
      });

      // Aguardar atualização do BehaviorSubject
      setTimeout(() => {
        const result = service.getActivePlan();
        expect(result).toEqual(activePlan);
      }, 0);
    });

    it('should return null when no active plan exists', () => {
      const result = service.getActivePlan();
      expect(result).toBeNull();
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      // Acessar método privado para teste
      const generateId = (service as any).generateId;
      const id1 = generateId.call(service);
      const id2 = generateId.call(service);
      
      expect(id1).toContain('plan_');
      expect(id2).toContain('plan_');
      expect(id1).not.toBe(id2);
    });
  });
});
