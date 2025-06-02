import { TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { User, RegisterData, LoginData } from '../models';

describe('AuthService', () => {
  let service: AuthService;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let mockUser: User;
  let mockAppData: any;

  beforeEach(() => {
    // Mock user data
    mockUser = {
      id: 'user-1',
      email: 'test@fitsync.app',
      name: 'João Silva',
      fitnessLevel: 'beginner',
      goals: ['weight_loss'],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    };

    // Mock app data
    mockAppData = {
      version: '1.0.0',
      lastUpdated: '2025-01-01T00:00:00.000Z',
      users: [mockUser],
      plans: [],
      days: [],
      workouts: [],
      exercises: [],
      sets: [],
      workoutSessions: [],
      exerciseLibrary: []
    };

    // Create spy for DataService
    const spy = jasmine.createSpyObj('DataService', ['saveData', 'getCurrentData'], {
      data$: new BehaviorSubject(mockAppData)
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: DataService, useValue: spy }
      ]
    });

    service = TestBed.inject(AuthService);
    dataServiceSpy = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', (done) => {
      const email = 'test@fitsync.app';
      const password = 'password123';

      service.login(email, password).subscribe({
        next: (user) => {
          expect(user).toEqual(mockUser);
          expect(localStorage.getItem('fitsync_current_user')).toBe(mockUser.id);
          done();
        },
        error: done.fail
      });
    });

    it('should throw error for invalid email', (done) => {
      const email = 'invalid@test.com';
      const password = 'password123';

      service.login(email, password).subscribe({
        next: () => done.fail('Expected error for invalid email'),
        error: (error) => {
          expect(error.message).toBe('Email ou password incorretos');
          done();
        }
      });
    });

    it('should throw error when data is not loaded', (done) => {
      dataServiceSpy.data$ = new BehaviorSubject(null);
      
      service.login('test@fitsync.app', 'password').subscribe({
        next: () => done.fail('Expected error for unloaded data'),
        error: (error) => {
          expect(error.message).toBe('Dados não carregados');
          done();
        }
      });
    });
  });

  describe('register', () => {
    it('should successfully register new user', (done) => {
      const registerData: RegisterData = {
        email: 'novo@fitsync.app',
        name: 'Novo Usuário',
        fitnessLevel: 'intermediate',
        goals: ['muscle_gain']
      };

      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(true));

      service.register(registerData).subscribe({
        next: (user) => {
          expect(user.email).toBe(registerData.email);
          expect(user.name).toBe(registerData.name);
          expect(user.fitnessLevel).toBe(registerData.fitnessLevel);
          expect(user.goals).toEqual(registerData.goals);
          expect(user.id).toBeDefined();
          expect(dataServiceSpy.saveData).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('should throw error for existing email', (done) => {
      const registerData: RegisterData = {
        email: 'test@fitsync.app', // Email já existe no mockAppData
        name: 'Usuário Duplicado',
        fitnessLevel: 'beginner',
        goals: ['weight_loss']
      };

      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);

      service.register(registerData).subscribe({
        next: () => done.fail('Expected error for existing email'),
        error: (error) => {
          expect(error.message).toBe('Email já está em uso');
          done();
        }
      });
    });

    it('should throw error when data is not loaded', (done) => {
      const registerData: RegisterData = {
        email: 'novo@fitsync.app',
        name: 'Novo Usuário',
        fitnessLevel: 'beginner',
        goals: ['weight_loss']
      };

      dataServiceSpy.getCurrentData.and.returnValue(null);

      service.register(registerData).subscribe({
        next: () => done.fail('Expected error for unloaded data'),
        error: (error) => {
          expect(error.message).toBe('Dados não carregados');
          done();
        }
      });
    });
  });

  describe('logout', () => {
    it('should clear user session on logout', () => {
      // Set up logged in state
      localStorage.setItem('fitsync_current_user', mockUser.id);
      service['currentUserSubject'].next(mockUser);

      service.logout();

      expect(localStorage.getItem('fitsync_current_user')).toBeNull();
      expect(service['currentUserSubject'].value).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user observable', (done) => {
      service['currentUserSubject'].next(mockUser);

      service.getCurrentUser().subscribe(user => {
        expect(user).toEqual(mockUser);
        done();
      });
    });

    it('should return null when no user is logged in', (done) => {
      service['currentUserSubject'].next(null);

      service.getCurrentUser().subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user is logged in', (done) => {
      service['currentUserSubject'].next(mockUser);

      service.isLoggedIn().subscribe(isLoggedIn => {
        expect(isLoggedIn).toBe(true);
        done();
      });
    });

    it('should return false when no user is logged in', (done) => {
      service['currentUserSubject'].next(null);

      service.isLoggedIn().subscribe(isLoggedIn => {
        expect(isLoggedIn).toBe(false);
        done();
      });
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', (done) => {
      const updates = {
        name: 'João Silva Updated',
        fitnessLevel: 'advanced' as const,
        goals: ['muscle_gain', 'strength']
      };

      service['currentUserSubject'].next(mockUser);
      dataServiceSpy.getCurrentData.and.returnValue(mockAppData);
      dataServiceSpy.saveData.and.returnValue(Promise.resolve(true));

      service.updateProfile(updates).subscribe({
        next: (updatedUser) => {
          expect(updatedUser.name).toBe(updates.name);
          expect(updatedUser.fitnessLevel).toBe(updates.fitnessLevel);
          expect(updatedUser.goals).toEqual(updates.goals);
          expect(dataServiceSpy.saveData).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });

    it('should throw error when user is not logged in', (done) => {
      service['currentUserSubject'].next(null);

      service.updateProfile({ name: 'Test' }).subscribe({
        next: () => done.fail('Expected error for unauthorized user'),
        error: (error) => {
          expect(error.message).toBe('Usuário não autenticado');
          done();
        }
      });
    });
  });
});
