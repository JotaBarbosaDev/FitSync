import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

interface ResetPasswordData {
  email: string;
  resetCode: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false,
})
export class ForgotPasswordPage implements OnInit {
  currentStep = 1; // 1: Email, 2: Code, 3: New Password
  totalSteps = 3;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  resetData: ResetPasswordData = {
    email: '',
    resetCode: '',
    newPassword: '',
    confirmPassword: ''
  };

  // Simulação de código para demo (em produção seria enviado por email)
  generatedCode = '';

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService
  ) { }

  ngOnInit() {
  }

  async sendResetCode() {
    if (!this.validateEmail()) {
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Enviando código...',
      duration: 2000
    });
    await loading.present();

    try {
      // Simular envio de email (em produção conectaria com API)
      this.generatedCode = this.generateResetCode();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await loading.dismiss();
      this.currentStep = 2;
      
      // Mostrar código para demo (em produção seria enviado por email)
      await this.showAlert(
        'Código Enviado', 
        `Código de verificação enviado para ${this.resetData.email}\n\n` +
        `Para demonstração, use o código: ${this.generatedCode}`
      );
      
    } catch (error) {
      await loading.dismiss();
      this.showAlert('Erro', 'Não foi possível enviar o código. Tente novamente.');
    } finally {
      this.isLoading = false;
    }
  }

  async verifyCode() {
    if (!this.resetData.resetCode.trim()) {
      this.showAlert('Campo obrigatório', 'Digite o código de verificação.');
      return;
    }

    if (this.resetData.resetCode !== this.generatedCode) {
      this.showAlert('Código inválido', 'O código digitado está incorreto.');
      return;
    }

    this.currentStep = 3;
  }

  async resetPassword() {
    if (!this.validateNewPassword()) {
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Atualizando senha...',
      duration: 2000
    });
    await loading.present();

    try {
      // Simular atualização de senha (em produção conectaria com API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await loading.dismiss();
      
      await this.showAlert(
        'Senha Atualizada!', 
        'Sua senha foi atualizada com sucesso. Você pode fazer login com a nova senha.'
      );
      
      this.router.navigate(['/auth/login']);
      
    } catch (error) {
      await loading.dismiss();
      this.showAlert('Erro', 'Não foi possível atualizar a senha. Tente novamente.');
    } finally {
      this.isLoading = false;
    }
  }

  private validateEmail(): boolean {
    if (!this.resetData.email.trim()) {
      this.showAlert('Campo obrigatório', 'Digite seu email.');
      return false;
    }

    if (!this.isValidEmail(this.resetData.email)) {
      this.showAlert('Email inválido', 'Digite um email válido.');
      return false;
    }

    return true;
  }

  private validateNewPassword(): boolean {
    if (!this.resetData.newPassword.trim()) {
      this.showAlert('Campo obrigatório', 'Digite a nova senha.');
      return false;
    }

    if (this.resetData.newPassword.length < 6) {
      this.showAlert('Senha fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return false;
    }

    if (this.resetData.newPassword !== this.resetData.confirmPassword) {
      this.showAlert('Senhas diferentes', 'A confirmação de senha não confere.');
      return false;
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateResetCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  updateField(field: string, event: Event) {
    const target = event.target as HTMLIonInputElement;
    const value = target.value as string;
    
    switch (field) {
      case 'email':
        this.resetData.email = value;
        break;
      case 'resetCode':
        this.resetData.resetCode = value;
        break;
      case 'newPassword':
        this.resetData.newPassword = value;
        break;
      case 'confirmPassword':
        this.resetData.confirmPassword = value;
        break;
    }
  }

  goBack() {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
