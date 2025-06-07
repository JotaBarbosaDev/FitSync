import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { User } from '../models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadUserData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadUserData() {
    const userSub = this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.currentUser = user;
      } else {
        this.router.navigate(['/auth/login']);
      }
    });
    this.subscriptions.push(userSub);
  }

  getFirstName(): string {
    if (!this.currentUser?.name) return 'Utilizador';
    
    // Remove espaços extras e quebras de linha
    const cleanName = this.currentUser.name.trim().replace(/\s+/g, ' ');
    
    // Divide por espaços e pega a primeira palavra
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0];
    
    // Verifica se o primeiro nome não está vazio
    return firstName && firstName.length > 0 ? firstName : 'Utilizador';
  }

  getFitnessLevelText(): string {
    if (!this.currentUser?.fitnessLevel) return 'N/A';
    
    const levels = {
      'beginner': 'Iniciante',
      'intermediate': 'Intermédio',
      'advanced': 'Avançado'
    };
    
    return levels[this.currentUser.fitnessLevel] || 'N/A';
  }

  getGoalText(goal: string): string {
    const goalTexts: { [key: string]: string } = {
      'lose_weight': 'Perder Peso',
      'gain_muscle': 'Ganhar Músculo',
      'build_strength': 'Aumentar Força',
      'improve_endurance': 'Melhorar Resistência',
      'tone_body': 'Tonificar Corpo',
      'improve_flexibility': 'Melhorar Flexibilidade',
      'general_fitness': 'Fitness Geral'
    };
    
    return goalTexts[goal] || goal;
  }

  getHeight(): string {
    return this.currentUser?.height ? `${this.currentUser.height} cm` : 'N/A';
  }

  getWeight(): string {
    return this.currentUser?.weight ? `${this.currentUser.weight} kg` : 'N/A';
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
            await this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      ]
    });
    await alert.present();
  }
}
