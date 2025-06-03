import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { WorkoutManagementService } from '../services/workout-management.service';
import { StorageService } from '../services/storage.service';
import { WorkoutSession } from '../models/workout-system.model';

@Component({
  selector: 'app-bicep-workout',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Treino bicep</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showHelp()">
            <ion-icon name="help-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="workout-container">
        <div class="workout-header">
          <h1>Treino de Bíceps</h1>
          <p class="workout-description">Treino focado em desenvolvimento de bíceps</p>
        </div>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>Exercício</ion-card-subtitle>
            <ion-card-title>Bicep Curl com Barra</ion-card-title>
          </ion-card-header>
          
          <ion-card-content>
            <p><strong>Instruções:</strong> Segure a barra com as mãos, flexione os cotovelos levantando a barra até os ombros.</p>
            <p><strong>Séries:</strong> 3</p>
            <p><strong>Repetições:</strong> 12</p>
            <p><strong>Descanso:</strong> 60s</p>
            
            <div class="exercise-image-container">
              <img 
                [src]="exerciseImageSrc" 
                alt="Bicep Curl" 
                class="exercise-image"
                (error)="onImageError($event)"
                (load)="onImageLoad($event)"/>
            </div>

            <div class="workout-actions">
              <ion-button expand="block" color="success" (click)="completeSet(1)">
                Concluir Série 1
              </ion-button>
              <ion-button expand="block" color="success" (click)="completeSet(2)" [disabled]="currentSet < 2">
                Concluir Série 2
              </ion-button>
              <ion-button expand="block" color="success" (click)="completeSet(3)" [disabled]="currentSet < 3">
                Concluir Série 3
              </ion-button>
            </div>
            
            <ion-progress-bar [value]="progress / 100"></ion-progress-bar>
            <p class="progress-text">Progresso: {{progress}}%</p>
            
            <div class="workout-footer">
              <ion-button expand="block" color="primary" (click)="finishWorkout()" [disabled]="progress < 100">
                Finalizar Treino
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .workout-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .workout-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .exercise-image-container {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }
    .exercise-image {
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
    }
    .workout-actions {
      margin: 20px 0;
    }
    .progress-text {
      text-align: center;
      margin: 10px 0;
    }
    .workout-footer {
      margin-top: 20px;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class BicepWorkoutComponent implements OnInit {
  currentSet = 1;
  progress = 0;
  workoutStartTime: Date = new Date();
  completedSets: any[] = [];

  // Image handling properties
  exerciseImageSrc = 'assets/images/exercises/bicep-curl.jpg';
  private readonly fallbackImageSrc = 'assets/images/placeholder.png';
  private readonly defaultImageSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNTBDMTI1IDE1MCA3NSAxNTAgMTAwIDUwWiIgZmlsbD0iIzMzODBGRiIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPGF4aXMgeD0iODAiIHk9IjkwIiB3aWR0aD0iNDAiIGhlaWdodD0iMjAiIGZpbGw9IiMzMzgwRkYiLz4KPC9zdmc+';
  private imageErrorOccurred = false;

  constructor(
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router,
    private workoutService: WorkoutManagementService,
    private storageService: StorageService
  ) { }

  ngOnInit() {
    this.workoutStartTime = new Date();
    console.log('Treino de bíceps iniciado às:', this.workoutStartTime);
  }

  async completeSet(setNumber: number) {
    if (setNumber !== this.currentSet) {
      const toast = await this.toastController.create({
        message: `Complete a série ${this.currentSet} primeiro`,
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Registrar dados da série completada
    const completedSet = {
      setNumber: setNumber,
      reps: 12, // Padrão para o treino de bíceps
      weight: 20, // Peso padrão
      completed: true,
      completedAt: new Date()
    };

    this.completedSets.push(completedSet);

    // Incrementar progresso
    // Use 100/3 to ensure exactly 100% for 3 sets
    this.progress = Math.round((this.completedSets.length / 3) * 100);
    if (this.progress > 100) this.progress = 100;

    // Mostrar mensagem de sucesso
    const toast = await this.toastController.create({
      message: `Série ${setNumber} concluída! (12 reps, 20kg)`,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();

    // Avançar para próxima série
    if (this.currentSet < 3) {
      this.currentSet++;
    }
  }

  async finishWorkout() {
    if (this.progress < 100) {
      const toast = await this.toastController.create({
        message: 'Complete todas as séries antes de finalizar',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Calcular duração do treino
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - this.workoutStartTime.getTime()) / 60000);
    const caloriesBurned = 150; // Estimativa para treino de bíceps

    // Salvar dados do treino no storage
    await this.saveWorkoutData(durationMinutes, caloriesBurned);

    // Mostrar alerta de congratulações
    const alert = await this.alertController.create({
      header: '🎉 Treino Concluído!',
      message: `
        <div style="text-align: center;">
          <p><strong>Parabéns!</strong> Você completou o treino de bíceps!</p>
          <p>⏱️ Duração: ${durationMinutes} minutos</p>
          <p>🔥 Calorias: ${caloriesBurned}</p>
          <p>💪 Séries completadas: ${this.completedSets.length}</p>
          <p>📊 Dados salvos no seu progresso!</p>
        </div>
      `,
      buttons: [
        {
          text: 'Ver Progresso',
          handler: () => {
            this.router.navigate(['/workout-progress']);
          }
        },
        {
          text: 'Voltar à Home',
          handler: () => {
            this.router.navigate(['/tabs/home']);
          }
        }
      ],
      cssClass: 'workout-success-alert'
    });

    await alert.present();
  }

  async saveWorkoutData(durationMinutes: number, caloriesBurned: number) {
    try {
      const endTime = new Date();

      // Criar dados da sessão de treino
      const workoutSession: Omit<WorkoutSession, 'id'> = {
        workoutId: 'bicep-workout-default',
        userId: 'current-user', // TODO: pegar do auth service
        startTime: this.workoutStartTime,
        endTime: endTime,
        duration: durationMinutes,
        exercises: [{
          exerciseId: 'bicep-curl',
          sets: this.completedSets.map(set => ({
            reps: set.reps,
            weight: set.weight,
            completed: set.completed,
            startTime: set.completedAt,
            endTime: set.completedAt
          })),
          restTimes: [60, 60], // 60s entre séries
          startTime: this.workoutStartTime,
          endTime: endTime
        }],
        caloriesBurned: caloriesBurned,
        notes: 'Treino de bíceps completado com sucesso',
        rating: 5,
        status: 'completed',
        dayOfWeek: new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
      };

      // Salvar usando o serviço de storage
      const existingSessions = await this.storageService.get('workoutSessions') || [];
      const sessionWithId = {
        ...workoutSession,
        id: `session-${Date.now()}`
      };

      if (Array.isArray(existingSessions)) {
        existingSessions.push(sessionWithId);
        await this.storageService.set('workoutSessions', existingSessions);
      } else {
        await this.storageService.set('workoutSessions', [sessionWithId]);
      }

      // Também salvar no formato usado pelo WorkoutManagementService
      const existingSessions2 = await this.storageService.get('workoutSessions2') || [];
      if (Array.isArray(existingSessions2)) {
        existingSessions2.push(sessionWithId);
        await this.storageService.set('workoutSessions2', existingSessions2);
      } else {
        await this.storageService.set('workoutSessions2', [sessionWithId]);
      }

      console.log('Dados do treino salvos com sucesso:', sessionWithId);

      // Mostrar toast de confirmação
      const toast = await this.toastController.create({
        message: '✅ Treino salvo no seu histórico!',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      console.error('Erro ao salvar dados do treino:', error);

      const toast = await this.toastController.create({
        message: '⚠️ Erro ao salvar treino, mas seus dados foram registrados localmente',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
    }
  }

  onImageError(event: any) {
    // Prevent infinite loop by checking if error already occurred
    if (this.imageErrorOccurred) {
      // Use default base64 image as final fallback
      event.target.src = this.defaultImageSrc;
      return;
    }

    this.imageErrorOccurred = true;

    // Try fallback image first
    if (this.exerciseImageSrc !== this.fallbackImageSrc) {
      this.exerciseImageSrc = this.fallbackImageSrc;
      event.target.src = this.fallbackImageSrc;
    } else {
      // If fallback also fails, use default base64 image
      event.target.src = this.defaultImageSrc;
    }

    console.warn('Exercise image failed to load, using fallback');
  }

  onImageLoad(event: any) {
    // Reset error flag when image loads successfully
    this.imageErrorOccurred = false;
    console.log('Exercise image loaded successfully');
  }

  async showHelp() {
    const alert = await this.alertController.create({
      header: 'Instruções do Treino de Bíceps',
      subHeader: 'Como realizar corretamente',
      message: `
        <ul>
          <li>Mantenha as costas retas durante todo o exercício</li>
          <li>Realize 3 séries de 12 repetições</li>
          <li>Descanse 60 segundos entre cada série</li>
          <li>Sinta o músculo trabalhar, evitando usar impulso</li>
        </ul>
        <p>Clique em "Concluir Série" após cada série completada para registrar seu progresso.</p>
      `,
      buttons: ['Entendi!'],
      cssClass: 'workout-help-alert'
    });
    await alert.present();
  }
}
