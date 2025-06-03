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
    // Não é necessário verificar autenticação aqui, pois o GuestGuard já faz isso
    console.log('LoginPage: Página de login carregada');
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
        next: () => {
          this.showToast('Login realizado com sucesso!', 'success');
          this.router.navigate(['/tabs/home']);
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

  async testNavigation() {
    console.log('=== TESTE DE NAVEGAÇÃO INICIADO ===');
    console.log('Estado atual:', {
      isLoading: this.isLoading,
      currentUrl: this.router.url
    });
    
    const alert = await this.alertController.create({
      header: 'Teste de Navegação',
      message: 'Tentando navegar para a página de registro...',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Prosseguir',
          handler: () => {
            this.router.navigate(['/auth/register']).then(
              success => console.log('Sucesso:', success),
              error => console.error('Erro:', error)
            );
          }
        }
      ]
    });
    
    await alert.present();
  }

  goToRegister() {
    console.log('Navegando para página de registro...');
    
    // Verificar se já está carregando
    if (this.isLoading) {
      console.log('Navegação bloqueada: operação em andamento');
      return;
    }
    
    // Não é necessário verificar autenticação aqui, pois o GuestGuard já fez isso
    
    try {
      console.log('Iniciando navegação...');
      this.isLoading = true;
      
      this.router.navigate(['/auth/register']).then(
        (success) => {
          console.log('Navegação bem-sucedida:', success);
          this.isLoading = false;
        },
        (error) => {
          console.error('Erro na navegação:', error);
          this.isLoading = false;
          this.showAlert('Erro', 'Não foi possível abrir a página de registro. Tente novamente.');
        }
      ).catch((error) => {
        console.error('Erro na promise de navegação:', error);
        this.isLoading = false;
        this.showAlert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
      });
    } catch (error) {
      console.error('Erro ao tentar navegar:', error);
      this.isLoading = false;
      this.showAlert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    }
  }

  async forgotPassword() {
    try {
      await this.router.navigate(['/auth/forgot-password']);
    } catch (error) {
      console.error('Erro na navegação para recuperação de senha:', error);
      const alert = await this.alertController.create({
        header: 'Erro de Navegação',
        message: 'Não foi possível abrir a página de recuperação de senha. Tente novamente.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  updateField(field: string, event: any) {
    const value = typeof event === 'object' && event.detail ? event.detail.value : '';
    if (field === 'email') {
      this.loginData.email = value;
    } else if (field === 'password') {
      this.loginData.password = value;
    }
    console.log(`Campo ${field} atualizado:`, value);
  }
}
