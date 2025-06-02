import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RegisterPage } from './register.page';
import { AuthService } from '../../services/auth.service';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAlertController: jasmine.SpyObj<AlertController>;
  let mockLoadingController: jasmine.SpyObj<LoadingController>;
  let mockToastController: jasmine.SpyObj<ToastController>;
  let mockAlert: jasmine.SpyObj<any>;
  let mockLoading: jasmine.SpyObj<any>;
  let mockToast: jasmine.SpyObj<any>;
  let mockUser: any;

  beforeEach(async () => {
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

    // Create spies for dependencies
    mockAuthService = jasmine.createSpyObj('AuthService', ['register']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAlert = jasmine.createSpyObj('Alert', ['present']);
    mockLoading = jasmine.createSpyObj('Loading', ['present', 'dismiss']);
    mockToast = jasmine.createSpyObj('Toast', ['present']);
    
    mockAlertController = jasmine.createSpyObj('AlertController', ['create']);
    mockLoadingController = jasmine.createSpyObj('LoadingController', ['create']);
    mockToastController = jasmine.createSpyObj('ToastController', ['create']);

    // Configure default return values
    mockAlertController.create.and.returnValue(Promise.resolve(mockAlert));
    mockLoadingController.create.and.returnValue(Promise.resolve(mockLoading));
    mockToastController.create.and.returnValue(Promise.resolve(mockToast));

    await TestBed.configureTestingModule({
      declarations: [RegisterPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: AlertController, useValue: mockAlertController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: ToastController, useValue: mockToastController }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.currentStep).toBe(1);
    expect(component.totalSteps).toBe(3);
    expect(component.registerData.email).toBe('');
    expect(component.registerData.password).toBe('');
    expect(component.registerData.name).toBe('');
    expect(component.registerData.height).toBe(0);
    expect(component.registerData.weight).toBe(0);
    expect(component.registerData.fitnessLevel).toBe('beginner');
    expect(component.registerData.goals).toEqual([]);
    expect(component.confirmPassword).toBe('');
    expect(component.showPassword).toBe(false);
    expect(component.showConfirmPassword).toBe(false);
    expect(component.isLoading).toBe(false);
  });

  it('should have correct step titles', () => {
    expect(component.stepTitles).toEqual([
      'Dados Básicos',
      'Perfil Físico',
      'Objetivos'
    ]);
  });

  it('should have fitness levels configured', () => {
    expect(component.fitnessLevels.length).toBe(3);
    expect(component.fitnessLevels[0].value).toBe('beginner');
    expect(component.fitnessLevels[1].value).toBe('intermediate');
    expect(component.fitnessLevels[2].value).toBe('advanced');
  });

  it('should have available goals configured', () => {
    expect(component.availableGoals.length).toBe(6);
    expect(component.availableGoals.map(g => g.value)).toContain('lose_weight');
    expect(component.availableGoals.map(g => g.value)).toContain('gain_muscle');
    expect(component.availableGoals.map(g => g.value)).toContain('build_strength');
  });

  describe('ngOnInit', () => {
    it('should log initialization messages', () => {
      spyOn(console, 'log');
      component.ngOnInit();
      expect(console.log).toHaveBeenCalledWith('RegisterPage: ngOnInit iniciado - página de registro carregada');
      expect(console.log).toHaveBeenCalledWith('RegisterPage: ngOnInit concluído');
    });
  });

  describe('multi-step navigation', () => {
    it('should advance to next step when validation passes', () => {
      spyOn(component, 'validateCurrentStep' as any).and.returnValue(true);
      
      component.currentStep = 1;
      component.nextStep();
      
      expect(component.currentStep).toBe(2);
    });

    it('should not advance to next step when validation fails', () => {
      spyOn(component, 'validateCurrentStep' as any).and.returnValue(false);
      
      component.currentStep = 1;
      component.nextStep();
      
      expect(component.currentStep).toBe(1);
    });

    it('should not advance beyond total steps', () => {
      spyOn(component, 'validateCurrentStep' as any).and.returnValue(true);
      
      component.currentStep = 3;
      component.nextStep();
      
      expect(component.currentStep).toBe(3);
    });

    it('should go to previous step', () => {
      component.currentStep = 2;
      component.prevStep();
      
      expect(component.currentStep).toBe(1);
    });

    it('should not go before first step', () => {
      component.currentStep = 1;
      component.prevStep();
      
      expect(component.currentStep).toBe(1);
    });

    it('should have previousStep alias for prevStep', () => {
      component.currentStep = 2;
      component.previousStep();
      
      expect(component.currentStep).toBe(1);
    });

    it('should calculate progress percentage correctly', () => {
      component.currentStep = 1;
      expect(component.getProgressPercentage()).toBe(33.333333333333336);
      
      component.currentStep = 2;
      expect(component.getProgressPercentage()).toBe(66.66666666666667);
      
      component.currentStep = 3;
      expect(component.getProgressPercentage()).toBe(100);
    });
  });

  describe('password strength', () => {
    it('should initialize with empty password strength', () => {
      expect(component.passwordStrength.score).toBe(0);
      expect(component.passwordStrength.label).toBe('');
      expect(component.passwordStrength.color).toBe('');
    });

    it('should reset password strength for empty password', () => {
      component.registerData.password = '';
      component.checkPasswordStrength();
      
      expect(component.passwordStrength.score).toBe(0);
      expect(component.passwordStrength.label).toBe('');
      expect(component.passwordStrength.color).toBe('');
    });

    it('should calculate very weak password strength', () => {
      component.registerData.password = 'a';
      component.checkPasswordStrength();
      
      expect(component.passwordStrength.score).toBe(1);
      expect(component.passwordStrength.label).toBe('Muito fraca');
      expect(component.passwordStrength.color).toBe('danger');
    });

    it('should calculate weak password strength', () => {
      component.registerData.password = 'abcdefgh';
      component.checkPasswordStrength();
      
      expect(component.passwordStrength.score).toBe(2);
      expect(component.passwordStrength.label).toBe('Fraca');
      expect(component.passwordStrength.color).toBe('warning');
    });

    it('should calculate medium password strength', () => {
      component.registerData.password = 'Abcdefgh';
      component.checkPasswordStrength();
      
      expect(component.passwordStrength.score).toBe(3);
      expect(component.passwordStrength.label).toBe('Média');
      expect(component.passwordStrength.color).toBe('warning');
    });

    it('should calculate strong password strength', () => {
      component.registerData.password = 'Abcdefgh1';
      component.checkPasswordStrength();
      
      expect(component.passwordStrength.score).toBe(4);
      expect(component.passwordStrength.label).toBe('Forte');
      expect(component.passwordStrength.color).toBe('success');
    });

    it('should calculate very strong password strength', () => {
      component.registerData.password = 'Abcdefgh1!';
      component.checkPasswordStrength();
      
      expect(component.passwordStrength.score).toBe(5);
      expect(component.passwordStrength.label).toBe('Muito forte');
      expect(component.passwordStrength.color).toBe('success');
    });
  });

  describe('password visibility toggles', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });

    it('should toggle confirm password visibility', () => {
      expect(component.showConfirmPassword).toBe(false);
      component.toggleConfirmPasswordVisibility();
      expect(component.showConfirmPassword).toBe(true);
      component.toggleConfirmPasswordVisibility();
      expect(component.showConfirmPassword).toBe(false);
    });
  });

  describe('goal management', () => {
    it('should add goal when checked', () => {
      const event = { detail: { checked: true } } as CustomEvent;
      component.onGoalChange('lose_weight', event);
      
      expect(component.registerData.goals).toContain('lose_weight');
    });

    it('should not add duplicate goals', () => {
      component.registerData.goals = ['lose_weight'];
      const event = { detail: { checked: true } } as CustomEvent;
      component.onGoalChange('lose_weight', event);
      
      expect(component.registerData.goals.filter(g => g === 'lose_weight').length).toBe(1);
    });

    it('should remove goal when unchecked', () => {
      component.registerData.goals = ['lose_weight', 'gain_muscle'];
      const event = { detail: { checked: false } } as CustomEvent;
      component.onGoalChange('lose_weight', event);
      
      expect(component.registerData.goals).not.toContain('lose_weight');
      expect(component.registerData.goals).toContain('gain_muscle');
    });
  });

  describe('onRegister', () => {
    beforeEach(() => {
      component.registerData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        height: 175,
        weight: 70,
        fitnessLevel: 'beginner',
        goals: ['lose_weight']
      };
      component.confirmPassword = 'Password123!';
    });

    it('should not proceed if form validation fails', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(false);
      
      await component.onRegister();
      
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should handle successful registration', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(true);
      spyOn(component, 'showToast' as any);
      mockAuthService.register.and.returnValue(of(mockUser));
      
      await component.onRegister();
      
      expect(mockAuthService.register).toHaveBeenCalledWith(component.registerData);
      expect(mockLoadingController.create).toHaveBeenCalled();
      expect(mockLoading.present).toHaveBeenCalled();
      expect(mockLoading.dismiss).toHaveBeenCalled();
      expect((component as any).showToast).toHaveBeenCalledWith('Conta criada com sucesso! Bem-vindo ao FitSync!', 'success');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/home']);
      expect(component.isLoading).toBe(false);
    });

    it('should handle registration error', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(true);
      spyOn(component, 'showAlert' as any);
      const errorMessage = 'Email já está em uso';
      mockAuthService.register.and.returnValue(throwError(() => ({ message: errorMessage })));
      
      await component.onRegister();
      
      expect(mockAuthService.register).toHaveBeenCalledWith(component.registerData);
      expect(mockLoadingController.create).toHaveBeenCalled();
      expect(mockLoading.present).toHaveBeenCalled();
      expect(mockLoading.dismiss).toHaveBeenCalled();
      expect((component as any).showAlert).toHaveBeenCalledWith('Erro', errorMessage);
      expect(component.isLoading).toBe(false);
    });

    it('should handle registration error without message', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(true);
      spyOn(component, 'showAlert' as any);
      mockAuthService.register.and.returnValue(throwError(() => ({})));
      
      await component.onRegister();
      
      expect((component as any).showAlert).toHaveBeenCalledWith('Erro', 'Ocorreu um erro ao criar sua conta. Tente novamente.');
    });

    it('should set loading state during registration', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(true);
      mockAuthService.register.and.returnValue(of(mockUser));
      
      const registerPromise = component.onRegister();
      expect(component.isLoading).toBe(true);
      
      await registerPromise;
      expect(component.isLoading).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should create and present alert', async () => {
      await (component as any).showAlert('Test Header', 'Test Message');
      
      expect(mockAlertController.create).toHaveBeenCalledWith({
        header: 'Test Header',
        message: 'Test Message',
        buttons: ['OK']
      });
      expect(mockAlert.present).toHaveBeenCalled();
    });

    it('should create and present toast', async () => {
      await (component as any).showToast('Test Message', 'success');
      
      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'Test Message',
        duration: 3000,
        position: 'bottom',
        color: 'success'
      });
      expect(mockToast.present).toHaveBeenCalled();
    });
  });
});
