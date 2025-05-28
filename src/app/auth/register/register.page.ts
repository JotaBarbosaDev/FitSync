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

  fitnessLevels = [
    { value: 'beginner', label: 'Iniciante' },
    { value: 'intermediate', label: 'Intermediário' },
    { value: 'advanced', label: 'Avançado' }
  ];

  availableGoals = [
    { value: 'lose_weight', label: 'Perder Peso' },
    { value: 'gain_muscle', label: 'Ganhar Músculo' },
    { value: 'build_strength', label: 'Aumentar Força' },
    { value: 'improve_endurance', label: 'Melhorar Resistência' },
    { value: 'general_fitness', label: 'Condicionamento Geral' },
    { value: 'tone_body', label: 'Tonificar o Corpo' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Verificar se já está logado
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
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
        next: (user) => {
          this.showToast('Conta criada com sucesso! Bem-vindo ao FitSync!', 'success');
          this.router.navigate(['/dashboard']);
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

  onGoalChange(goal: string, event: any) {
    if (event.detail.checked) {
      if (!this.registerData.goals.includes(goal as any)) {
        this.registerData.goals.push(goal as any);
      }
    } else {
      this.registerData.goals = this.registerData.goals.filter(g => g !== goal);
    }
  }

  isGoalSelected(goal: string): boolean {
    return this.registerData.goals.includes(goal as any);
  }

  updateField(field: string, event: any) {
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
  }

  private validateForm(): boolean {
    // Validar campos obrigatórios
    if (!this.registerData.email || !this.registerData.password || !this.registerData.name) {
      this.showAlert('Campos obrigatórios', 'Por favor, preencha todos os campos obrigatórios.');
      return false;
    }

    // Validar email
    if (!this.isValidEmail(this.registerData.email)) {
      this.showAlert('Email inválido', 'Por favor, insira um email válido.');
      return false;
    }

    // Validar senha
    if (this.registerData.password.length < 6) {
      this.showAlert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    // Validar confirmação de senha
    if (this.registerData.password !== this.confirmPassword) {
      this.showAlert('Senhas diferentes', 'A confirmação de senha não confere.');
      return false;
    }

    // Validar altura e peso (se fornecidos)
    if (this.registerData.height && (this.registerData.height < 100 || this.registerData.height > 250)) {
      this.showAlert('Altura inválida', 'Por favor, insira uma altura válida (100-250 cm).');
      return false;
    }

    if (this.registerData.weight && (this.registerData.weight < 30 || this.registerData.weight > 300)) {
      this.showAlert('Peso inválido', 'Por favor, insira um peso válido (30-300 kg).');
      return false;
    }

    return true;
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
}
