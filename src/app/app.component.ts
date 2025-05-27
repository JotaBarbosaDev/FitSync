import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';
import { User } from './models';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private menuController: MenuController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async navigateTo(path: string) {
    await this.menuController.close();
    this.router.navigate([path]);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Confirmar Logout',
      message: 'Tem certeza que deseja sair?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sair',
          handler: async () => {
            await this.menuController.close();
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      ]
    });
    await alert.present();
  }
}
