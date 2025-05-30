import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { RegisterData } from '../../models';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  // Multi-step form control
  currentStep = 1;
  totalSteps = 3;
  stepTitles = [
    'Dados Básicos',
    'Perfil Físico', 
    'Objetivos'
  ];

  registerData: RegisterData = {
    email: '',
    password: '',
    name: '',
    height: 0,
    weight: 0,
    fitnessLevel: 'beginner',
    goals: []
  };

  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;

  // Password strength indicator
  passwordStrength = {
    score: 0,
    label: '',
    color: ''
  };

  fitnessLevels = [
    { 
      value: 'beginner', 
      label: 'Iniciante',
      description: 'Pouca ou nenhuma experiência com exercícios',
      icon: 'leaf-outline'
    },
    { 
      value: 'intermediate', 
      label: 'Intermediário',
      description: 'Pratica exercícios regularmente há alguns meses',
      icon: 'fitness-outline'
    },
    { 
      value: 'advanced', 
      label: 'Avançado',
      description: 'Experiência consistente e sólida com exercícios',
      icon: 'trophy-outline'
    }
  ];

  availableGoals = [
    { 
      value: 'lose_weight', 
      label: 'Perder Peso',
      description: 'Queimar gordura e reduzir medidas',
      icon: 'trending-down-outline'
    },
    { 
      value: 'gain_muscle', 
      label: 'Ganhar Músculo',
      description: 'Aumentar massa muscular',
      icon: 'body-outline'
    },
    { 
      value: 'build_strength', 
      label: 'Aumentar Força',
      description: 'Melhorar capacidade de força',
      icon: 'barbell-outline'
    },
    { 
      value: 'improve_endurance', 
      label: 'Melhorar Resistência',
      description: 'Aumentar capacidade cardiovascular',
      icon: 'heart-outline'
    },
    { 
      value: 'general_fitness', 
      label: 'Condicionamento Geral',
      description: 'Manter-se em forma e saudável',
      icon: 'checkmark-circle-outline'
    },
    { 
      value: 'tone_body', 
      label: 'Tonificar o Corpo',
      description: 'Definir músculos e melhorar forma física',
      icon: 'diamond-outline'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    console.log('RegisterPage: ngOnInit iniciado - página de registro carregada');
    // Não é necessário verificar autenticação aqui, pois o GuestGuard já faz isso
    console.log('RegisterPage: ngOnInit concluído');
  }

  // Multi-step navigation methods
  nextStep() {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Alias para o template
  previousStep() {
    this.prevStep();
  }

  goToStep(step: number) {
    if (step >= 1 && step <= this.totalSteps) {
      // Validar todos os passos anteriores
      for (let i = 1; i < step; i++) {
        const currentStepBackup = this.currentStep;
        this.currentStep = i;
        if (!this.validateCurrentStep()) {
          this.currentStep = currentStepBackup;
          return;
        }
      }
      this.currentStep = step;
    }
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  // Password strength calculation
  checkPasswordStrength() {
    const password = this.registerData.password;
    let score = 0;
    let label = '';
    let color = '';

    if (password.length === 0) {
      this.passwordStrength = { score: 0, label: '', color: '' };
      return;
    }

    // Critérios de força da senha
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        label = 'Muito fraca';
        color = 'danger';
        break;
      case 2:
        label = 'Fraca';
        color = 'warning';
        break;
      case 3:
        label = 'Média';
        color = 'warning';
        break;
      case 4:
        label = 'Forte';
        color = 'success';
        break;
      case 5:
        label = 'Muito forte';
        color = 'success';
        break;
    }

    this.passwordStrength = { score, label, color };
  }

  async onRegister() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Criando sua conta...',
      duration: 10000
    });
    await loading.present();

    try {
      this.authService.register(this.registerData).subscribe({
        next: () => {
          this.showToast('Conta criada com sucesso! Bem-vindo ao FitSync!', 'success');
          this.router.navigate(['/tabs/home']);
          this.isLoading = false;
          loading.dismiss();
        },
        error: (error) => {
          console.error('Erro no registro:', error);
          this.showAlert('Erro', error.message || 'Ocorreu um erro ao criar sua conta. Tente novamente.');
          this.isLoading = false;
          loading.dismiss();
        }
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      await this.showAlert('Erro', 'Ocorreu um erro ao criar sua conta. Tente novamente.');
      this.isLoading = false;
      loading.dismiss();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onGoalChange(goal: string, event: CustomEvent) {
    if (event.detail.checked) {
      if (!this.registerData.goals.includes(goal)) {
        this.registerData.goals.push(goal);
      }
    } else {
      this.registerData.goals = this.registerData.goals.filter(g => g !== goal);
    }
  }

  isGoalSelected(goal: string): boolean {
    return this.registerData.goals.includes(goal);
  }

  updateField(field: string, event: CustomEvent) {
    const value = event.detail.value;
    switch (field) {
      case 'name':
        this.registerData.name = value;
        break;
      case 'email':
        this.registerData.email = value;
        break;
      case 'password':
        this.registerData.password = value;
        this.checkPasswordStrength(); // Atualizar força da senha
        break;
      case 'confirmPassword':
        this.confirmPassword = value;
        break;
      case 'height':
        this.registerData.height = parseFloat(value) || 0;
        break;
      case 'weight':
        this.registerData.weight = parseFloat(value) || 0;
        break;
      case 'fitnessLevel':
        this.registerData.fitnessLevel = value;
        break;
    }
    
    // Invalidar cache de validação para forçar recálculo
    this._lastValidationData = '';
  }

  // Step-specific validation
  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.validateStep1();
      case 2:
        return this.validateStep2();
      case 3:
        return this.validateStep3();
      default:
        return true;
    }
  }

  private validateStep1(showAlerts: boolean = true): boolean {
    // Validar dados básicos
    if (!this.registerData.name.trim()) {
      if (showAlerts) this.showAlert('Campo obrigatório', 'Por favor, digite seu nome.');
      return false;
    }

    if (!this.registerData.email.trim()) {
      if (showAlerts) this.showAlert('Campo obrigatório', 'Por favor, digite seu email.');
      return false;
    }

    if (!this.isValidEmail(this.registerData.email)) {
      if (showAlerts) this.showAlert('Email inválido', 'Por favor, insira um email válido.');
      return false;
    }

    if (!this.registerData.password) {
      if (showAlerts) this.showAlert('Campo obrigatório', 'Por favor, digite uma senha.');
      return false;
    }

    if (this.registerData.password.length < 6) {
      if (showAlerts) this.showAlert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    if (this.registerData.password !== this.confirmPassword) {
      if (showAlerts) this.showAlert('Senhas diferentes', 'A confirmação de senha não confere.');
      return false;
    }

    return true;
  }

  private validateStep2(showAlerts: boolean = true): boolean {
    // Validação opcional para dados físicos
    if (this.registerData.height && (this.registerData.height < 100 || this.registerData.height > 250)) {
      if (showAlerts) this.showAlert('Altura inválida', 'Por favor, insira uma altura válida (100-250 cm).');
      return false;
    }

    if (this.registerData.weight && (this.registerData.weight < 30 || this.registerData.weight > 300)) {
      if (showAlerts) this.showAlert('Peso inválido', 'Por favor, insira um peso válido (30-300 kg).');
      return false;
    }

    return true;
  }

  private validateStep3(showAlerts: boolean = true): boolean {
    // Validação dos objetivos (pelo menos um deve ser selecionado)
    if (this.registerData.goals.length === 0) {
      if (showAlerts) this.showAlert('Objetivos necessários', 'Por favor, selecione pelo menos um objetivo.');
      return false;
    }

    return true;
  }

  private validateForm(): boolean {
    // Validar todos os steps sem mostrar alertas
    for (let i = 1; i <= this.totalSteps; i++) {
      const currentStepBackup = this.currentStep;
      this.currentStep = i;
      let isValid = false;
      
      switch (i) {
        case 1:
          isValid = this.validateStep1(false);
          break;
        case 2:
          isValid = this.validateStep2(false);
          break;
        case 3:
          isValid = this.validateStep3(false);
          break;
      }
      
      this.currentStep = currentStepBackup;
      
      if (!isValid) {
        return false;
      }
    }
    return true;
  }

  // UI Helper methods - Cached properties para evitar recálculos constantes
  private _step1Valid: boolean = false;
  private _step2Valid: boolean = true; // Step 2 é opcional
  private _step3Valid: boolean = false;
  private _formValid: boolean = false;
  private _lastValidationData: string = '';

  private updateValidationCache(): void {
    const currentData = JSON.stringify({
      name: this.registerData.name,
      email: this.registerData.email,
      password: this.registerData.password,
      confirmPassword: this.confirmPassword,
      height: this.registerData.height,
      weight: this.registerData.weight,
      goals: this.registerData.goals
    });

    if (currentData !== this._lastValidationData) {
      this._step1Valid = this.validateStep1(false);
      this._step2Valid = this.validateStep2(false);
      this._step3Valid = this.validateStep3(false);
      this._formValid = this._step1Valid && this._step2Valid && this._step3Valid;
      this._lastValidationData = currentData;
    }
  }

  isStepValid(step: number): boolean {
    this.updateValidationCache();
    switch (step) {
      case 1: return this._step1Valid;
      case 2: return this._step2Valid;
      case 3: return this._step3Valid;
      default: return true;
    }
  }

  canProceedToNextStep(): boolean {
    this.updateValidationCache();
    switch (this.currentStep) {
      case 1: return this._step1Valid;
      case 2: return this._step2Valid;
      case 3: return this._step3Valid;
      default: return true;
    }
  }

  canGoToStep(step: number): boolean {
    // Pode ir para passos anteriores ou o próximo se o atual for válido
    return step < this.currentStep || (step === this.currentStep + 1 && this.canProceedToNextStep());
  }

  // Fitness level selection methods
  selectFitnessLevel(level: 'beginner' | 'intermediate' | 'advanced') {
    this.registerData.fitnessLevel = level;
  }

  isFitnessLevelSelected(level: string): boolean {
    return this.registerData.fitnessLevel === level;
  }

  // Goal selection methods (updated)
  toggleGoal(goal: string) {
    if (this.isGoalSelected(goal)) {
      this.registerData.goals = this.registerData.goals.filter(g => g !== goal);
    } else {
      this.registerData.goals.push(goal);
    }
    // Invalidar cache de validação
    this._lastValidationData = '';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  // Utility methods for UI
  getCurrentStepTitle(): string {
    return this.stepTitles[this.currentStep - 1] || '';
  }

  getStepTitle(step: number): string {
    return this.stepTitles[step - 1] || '';
  }

  isFirstStep(): boolean {
    return this.currentStep === 1;
  }

  isLastStep(): boolean {
    return this.currentStep === this.totalSteps;
  }

  // Métodos para animações e transições
  getStepAnimation(): string {
    return 'fadeIn';
  }

  // Método para resetar formulário se necessário
  resetForm() {
    this.registerData = {
      email: '',
      password: '',
      name: '',
      height: 0,
      weight: 0,
      fitnessLevel: 'beginner',
      goals: []
    };
    this.confirmPassword = '';
    this.currentStep = 1;
    this.passwordStrength = { score: 0, label: '', color: '' };
  }

  // Método para calcular IMC (se altura e peso estiverem disponíveis)
  calculateBMI(): number | null {
    if (this.registerData.height && this.registerData.weight) {
      const heightInMeters = this.registerData.height / 100;
      return this.registerData.weight / (heightInMeters * heightInMeters);
    }
    return null;
  }

  getBMICategory(): string {
    const bmi = this.calculateBMI();
    if (!bmi) return '';
    
    if (bmi < 18.5) return 'Abaixo do peso';
    if (bmi < 25) return 'Peso normal';
    if (bmi < 30) return 'Sobrepeso';
    return 'Obesidade';
  }

  // Métodos chamados no template HTML - Otimizados para evitar loops infinitos
  getPasswordStrength(): string {
    return this.passwordStrength.color;
  }

  getPasswordStrengthText(): string {
    return this.passwordStrength.label;
  }

  passwordsMatch(): boolean {
    return this.registerData.password === this.confirmPassword;
  }

  isStep1Valid(): boolean {
    this.updateValidationCache();
    return this._step1Valid;
  }

  isStep2Valid(): boolean {
    this.updateValidationCache();
    return this._step2Valid;
  }

  isStep3Valid(): boolean {
    this.updateValidationCache();
    return this._step3Valid;
  }

  isFormValid(): boolean {
    this.updateValidationCache();
    return this._formValid;
  }
}
