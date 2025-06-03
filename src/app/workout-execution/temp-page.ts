import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-workout-execution',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Execução de Treino</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="loading" class="loading-container">
        <ion-spinner></ion-spinner>
        <p>Carregando treino...</p>
      </div>
      
      <div *ngIf="!loading">
        <div class="redirect-message">
          <h2>Redirecionando para seu treino</h2>
          <p>Você será redirecionado para o treino de bicep automaticamente.</p>
          <ion-button expand="block" (click)="goToBicepWorkout()">
            Ir para Treino de Bicep
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .redirect-message {
      text-align: center;
      margin-top: 20px;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class WorkoutExecutionPage implements OnInit {
  loading = true;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Simular carregamento
    setTimeout(() => {
      this.loading = false;
      // Redirecionar para o treino de bicep após um breve período
      setTimeout(() => {
        this.goToBicepWorkout();
      }, 1000);
    }, 1000);
  }

  goToBicepWorkout() {
    this.router.navigate(['/workout-execution/bicep']);
  }

  // Método auxiliar para mostrar mensagens toast
  async showMessage(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
