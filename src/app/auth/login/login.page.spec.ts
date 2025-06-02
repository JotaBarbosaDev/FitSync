import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginPage } from './login.page';
import { AuthService } from '../../services/auth.service';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
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
    mockAuthService = jasmine.createSpyObj('AuthService', ['login']);
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
      declarations: [LoginPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: AlertController, useValue: mockAlertController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: ToastController, useValue: mockToastController }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.loginData.email).toBe('');
    expect(component.loginData.password).toBe('');
    expect(component.showPassword).toBe(false);
    expect(component.isLoading).toBe(false);
  });

  describe('ngOnInit', () => {
    it('should log initialization message', () => {
      spyOn(console, 'log');
      component.ngOnInit();
      expect(console.log).toHaveBeenCalledWith('LoginPage: Página de login carregada');
    });
  });

  describe('togglePasswordVisibility', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });
  });

  describe('validateForm', () => {
    it('should return false if email is empty', async () => {
      component.loginData = { email: '', password: 'password123' };
      spyOn(component, 'showAlert' as any);
      
      const result = (component as any).validateForm();
      
      expect(result).toBe(false);
      expect((component as any).showAlert).toHaveBeenCalledWith(
        'Campos obrigatórios', 
        'Por favor, preencha todos os campos.'
      );
    });

    it('should return false if password is empty', async () => {
      component.loginData = { email: 'test@example.com', password: '' };
      spyOn(component, 'showAlert' as any);
      
      const result = (component as any).validateForm();
      
      expect(result).toBe(false);
      expect((component as any).showAlert).toHaveBeenCalledWith(
        'Campos obrigatórios', 
        'Por favor, preencha todos os campos.'
      );
    });

    it('should return false if email is invalid', async () => {
      component.loginData = { email: 'invalid-email', password: 'password123' };
      spyOn(component, 'showAlert' as any);
      
      const result = (component as any).validateForm();
      
      expect(result).toBe(false);
      expect((component as any).showAlert).toHaveBeenCalledWith(
        'Email inválido', 
        'Por favor, insira um email válido.'
      );
    });

    it('should return true if all fields are valid', () => {
      component.loginData = { email: 'test@example.com', password: 'password123' };
      
      const result = (component as any).validateForm();
      
      expect(result).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user@domain.co.uk',
        'email.test@subdomain.domain.com'
      ];

      validEmails.forEach(email => {
        expect((component as any).isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'test@',
        'test..email@domain.com',
        ''
      ];

      invalidEmails.forEach(email => {
        expect((component as any).isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('onLogin', () => {
    beforeEach(() => {
      component.loginData = { email: 'test@example.com', password: 'password123' };
    });

    it('should not proceed if form validation fails', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(false);
      
      await component.onLogin();
      
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle successful login', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(true);
      spyOn(component, 'showToast' as any);
      mockAuthService.login.and.returnValue(of(mockUser));
      
      await component.onLogin();
      
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockLoadingController.create).toHaveBeenCalled();
      expect(mockLoading.present).toHaveBeenCalled();
      expect(mockLoading.dismiss).toHaveBeenCalled();
      expect((component as any).showToast).toHaveBeenCalledWith('Login realizado com sucesso!', 'success');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/home']);
      expect(component.isLoading).toBe(false);
    });

    it('should handle login error', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(true);
      spyOn(component, 'showAlert' as any);
      const errorMessage = 'Email ou senha incorretos';
      mockAuthService.login.and.returnValue(throwError(() => ({ message: errorMessage })));
      
      await component.onLogin();
      
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockLoadingController.create).toHaveBeenCalled();
      expect(mockLoading.present).toHaveBeenCalled();
      expect(mockLoading.dismiss).toHaveBeenCalled();
      expect((component as any).showAlert).toHaveBeenCalledWith('Erro', errorMessage);
      expect(component.isLoading).toBe(false);
    });

    it('should handle login error without message', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(true);
      spyOn(component, 'showAlert' as any);
      mockAuthService.login.and.returnValue(throwError(() => ({})));
      
      await component.onLogin();
      
      expect((component as any).showAlert).toHaveBeenCalledWith('Erro', 'Email ou senha incorretos.');
    });

    it('should set loading state during login', async () => {
      spyOn(component, 'validateForm' as any).and.returnValue(true);
      mockAuthService.login.and.returnValue(of(mockUser));
      
      const loginPromise = component.onLogin();
      expect(component.isLoading).toBe(true);
      
      await loginPromise;
      expect(component.isLoading).toBe(false);
    });
  });

  describe('showAlert', () => {
    it('should create and present alert', async () => {
      await (component as any).showAlert('Test Header', 'Test Message');
      
      expect(mockAlertController.create).toHaveBeenCalledWith({
        header: 'Test Header',
        message: 'Test Message',
        buttons: ['OK']
      });
      expect(mockAlert.present).toHaveBeenCalled();
    });
  });

  describe('showToast', () => {
    it('should create and present toast with default color', async () => {
      await (component as any).showToast('Test Message');
      
      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'Test Message',
        duration: 3000,
        position: 'bottom',
        color: 'success'
      });
      expect(mockToast.present).toHaveBeenCalled();
    });

    it('should create and present toast with custom color', async () => {
      await (component as any).showToast('Error Message', 'danger');
      
      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'Error Message',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      expect(mockToast.present).toHaveBeenCalled();
    });
  });
});
