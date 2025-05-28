import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoginData } from '../../models';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  loginData: LoginData = {
    email: '',
    password: ''
  };

  showPassword = false;
  isLoading = false;

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
  async onLogin() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Entrando...',
      duration: 10000
    });
    await loading.present();

    try {
      this.authService.login(this.loginData.email, this.loginData.password).subscribe({
        next: (user) => {
          this.showToast('Login realizado com sucesso!', 'success');
          this.router.navigate(['/dashboard']);
          this.isLoading = false;
          loading.dismiss();
        },
        error: (error) => {
          console.error('Erro no login:', error);
          this.showAlert('Erro', error.message || 'Email ou senha incorretos.');
          this.isLoading = false;
          loading.dismiss();
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      await this.showAlert('Erro', 'Ocorreu um erro ao fazer login. Tente novamente.');
      this.isLoading = false;
      loading.dismiss();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private validateForm(): boolean {
    if (!this.loginData.email || !this.loginData.password) {
      this.showAlert('Campos obrigatórios', 'Por favor, preencha todos os campos.');
      return false;
    }

    if (!this.isValidEmail(this.loginData.email)) {
      this.showAlert('Email inválido', 'Por favor, insira um email válido.');
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

  goToRegister() {
    this.router.navigate(['/auth/register']);
  }

  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Recuperar Senha',
      message: 'Funcionalidade em desenvolvimento. Entre em contato com o suporte.',
      buttons: ['OK']
    });
    await alert.present();
  }

  updateField(field: string, event: any) {
    const value = event.detail.value;
    if (field === 'email') {
      this.loginData.email = value;
    } else if (field === 'password') {
      this.loginData.password = value;
    }
  }
}
