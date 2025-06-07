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
    
    // Debug: verificar estado do storage
    this.debugAuthState();
  }

  async debugAuthState() {
    try {
      const debugInfo = await this.authService.debugStorage();
      console.log('LoginPage: Estado da autenticação:', debugInfo);
    } catch (error) {
      console.error('LoginPage: Erro ao fazer debug:', error);
    }
  }
  async onLogin() {
    if (!this.validateForm()) {
      return;
    }

    console.log('LoginPage: Iniciando processo de login');
    console.log('LoginPage: Email fornecido:', this.loginData.email);

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Entrando...',
      duration: 10000
    });
    await loading.present();

    try {
      // Normalizar dados de entrada
      const normalizedEmail = this.loginData.email.toLowerCase().trim();
      
      this.authService.login(normalizedEmail, this.loginData.password).subscribe({
        next: (user) => {
          console.log('LoginPage: Login bem-sucedido para:', user.email);
          this.showToast('Login realizado com sucesso!', 'success');
          this.router.navigate(['/tabs/home']);
          this.isLoading = false;
          loading.dismiss();
        },
        error: (error) => {
          console.error('LoginPage: Erro no login:', error);
          
          // Debug adicional em caso de erro
          this.debugAuthState();
          
          this.showAlert('Erro', error.message || 'Email ou senha incorretos.');
          this.isLoading = false;
          loading.dismiss();
        }
      });
    } catch (error) {
      console.error('LoginPage: Erro no login:', error);
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

  // Método para preencher credenciais demo
  fillDemoCredentials() {
    this.loginData.email = 'demo@fitsync.app';
    this.loginData.password = 'demo123';
    this.showToast('Credenciais demo preenchidas', 'success');
  }

  // Método para debug - mostrar informações do storage
  async showDebugInfo() {
    try {
      const debugInfo = await this.authService.debugStorage();
      const users = await this.authService.getAllUsers();
      
      // Primeiro, mostrar no console de forma organizada
      console.group('🔍 DEBUG - Estado do Sistema');
      console.log('📊 Utilizadores registados:', debugInfo.totalUsers);
      console.log('💾 Storage inicializado:', debugInfo.storageInitialized ? 'Sim' : 'Não');
      console.log('👤 Utilizador atual:', debugInfo.currentUser ? debugInfo.currentUser.email : 'Nenhum');
      console.log('📧 Emails registados:');
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.name})`);
      });
      console.groupEnd();
      
      // Criar mensagem simples para o alert
      const userCount = debugInfo.totalUsers;
      const currentUser = debugInfo.currentUser ? debugInfo.currentUser.email : 'Nenhum';
      const storageStatus = debugInfo.storageInitialized ? 'Sim' : 'Não';
      
      // Usar uma mensagem mais simples
      const message = `Utilizadores: ${userCount}
Storage: ${storageStatus}
Atual: ${currentUser}

Ver console para detalhes completos`;
      
      const alert = await this.alertController.create({
        header: 'Debug - Estado do Sistema',
        message: message,
        cssClass: 'debug-alert',
        buttons: [
          {
            text: 'Fechar',
            role: 'cancel'
          },
          {
            text: 'Ver Detalhes',
            handler: () => {
              // Mostrar informações mais detalhadas no console
              console.table(users.map(u => ({
                ID: u.id,
                Email: u.email,
                Nome: u.name,
                'Criado em': u.createdAt
              })));
              this.showToast('Detalhes no console do navegador (F12)', 'success');
            }
          },
          {
            text: 'Forçar Demo',
            handler: async () => {
              const created = await this.authService.ensureDemoAccount();
              if (created) {
                this.showToast('Conta demo criada!', 'success');
              } else {
                this.showToast('Conta demo já existe', 'warning');
              }
              // Atualizar debug após 1 segundo
              setTimeout(() => this.showDebugInfo(), 1000);
            }
          }
        ]
      });
      await alert.present();
    } catch (error) {
      console.error('Erro ao mostrar debug:', error);
      this.showAlert('Erro', 'Erro ao obter informações de debug');
    }
  }

  // Método para mostrar TODOS os dados armazenados no console
  async showAllStoredData() {
    try {
      await this.authService.debugAllStoredData();
      
      const alert = await this.alertController.create({
        header: 'Debug - Dados Completos',
        message: 'Todos os dados armazenados foram exibidos no console do navegador (F12). Verifique a aba Console para ver os detalhes completos.',
        buttons: [
          {
            text: 'Fechar',
            role: 'cancel'
          },
          {
            text: 'Abrir Console',
            handler: () => {
              this.showToast('Use F12 para abrir o console do navegador', 'success');
            }
          }
        ]
      });
      await alert.present();
    } catch (error) {
      console.error('Erro ao mostrar dados completos:', error);
      this.showAlert('Erro', 'Erro ao obter dados completos');
    }
  }

  // Método para limpar todos os dados exceto credenciais demo
  async clearAllDataExceptDemo() {
    try {
      const alert = await this.alertController.create({
        header: '⚠️ Confirmação',
        message: 'Esta ação irá limpar TODOS os dados armazenados, exceto a conta demo. Esta operação não pode ser desfeita. Deseja continuar?',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Sim, Limpar',
            handler: async () => {
              const loading = await this.loadingController.create({
                message: 'Limpando dados...',
                duration: 10000
              });
              await loading.present();

              try {
                const success = await this.authService.clearAllDataExceptDemo();
                loading.dismiss();
                
                if (success) {
                  this.showToast('Dados limpos com sucesso! Apenas conta demo preservada.', 'success');
                  // Recarregar a página após limpeza
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                } else {
                  this.showAlert('Erro', 'Não foi possível limpar os dados. Verifique o console para detalhes.');
                }
              } catch (error) {
                loading.dismiss();
                console.error('Erro durante limpeza:', error);
                this.showAlert('Erro', 'Ocorreu um erro durante a limpeza dos dados.');
              }
            }
          }
        ]
      });
      await alert.present();
    } catch (error) {
      console.error('Erro ao configurar limpeza:', error);
      this.showAlert('Erro', 'Erro ao configurar limpeza de dados');
    }
  }
}
