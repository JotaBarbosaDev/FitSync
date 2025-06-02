import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController, ActionSheetController } from '@ionic/angular';
import { WorkoutManagementService } from '../services/workout-management.service';
import { WeeklyPlan, DayPlan, CustomWorkout } from '../models/workout-system.model';

@Component({
  selector: 'app-weekly-plan',
  templateUrl: './weekly-plan.page.html',
  styleUrls: ['./weekly-plan.page.scss'],
})
export class WeeklyPlanPage implements OnInit {
  currentPlan: WeeklyPlan | null = null;
  availableWorkouts: CustomWorkout[] = [];
  
  daysOfWeek = [
    { key: 'monday', name: 'Segunda-feira', shortName: 'SEG' },
    { key: 'tuesday', name: 'Terça-feira', shortName: 'TER' },
    { key: 'wednesday', name: 'Quarta-feira', shortName: 'QUA' },
    { key: 'thursday', name: 'Quinta-feira', shortName: 'QUI' },
    { key: 'friday', name: 'Sexta-feira', shortName: 'SEX' },
    { key: 'saturday', name: 'Sábado', shortName: 'SAB' },
    { key: 'sunday', name: 'Domingo', shortName: 'DOM' }
  ];

  constructor(
    private workoutService: WorkoutManagementService,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) { }

  async ngOnInit() {
    await this.loadData();
  }

  async ionViewWillEnter() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.workoutService.getCurrentWeeklyPlan().subscribe(plan => {
        this.currentPlan = plan;
      });
      
      this.workoutService.getAllWorkouts().subscribe(workouts => {
        this.availableWorkouts = workouts;
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      await this.showToast('Erro ao carregar dados', 'danger');
    }
  }

  getDayPlan(dayKey: string): DayPlan {
    if (!this.currentPlan) {
      return { 
        date: new Date().toISOString().split('T')[0],
        type: 'rest',
        isRestDay: true,
        completed: false
      };
    }
    
    const defaultDayPlan: DayPlan = {
      date: new Date().toISOString().split('T')[0],
      type: 'rest',
      isRestDay: true,
      completed: false
    };
    
    return this.currentPlan.days[dayKey as keyof typeof this.currentPlan.days] || defaultDayPlan;
  }

  getWorkoutName(workoutId: string): string {
    const workout = this.availableWorkouts.find(w => w.id === workoutId);
    return workout?.name || 'Treino não encontrado';
  }

  getDayStatusIcon(dayKey: string): string {
    const dayPlan = this.getDayPlan(dayKey);
    if (dayPlan.type === 'rest') return 'bed-outline';
    if (dayPlan.type === 'workout') return 'fitness-outline';
    return 'help-outline';
  }

  getDayStatusColor(dayKey: string): string {
    const dayPlan = this.getDayPlan(dayKey);
    if (dayPlan.type === 'rest') return 'medium';
    if (dayPlan.type === 'workout') return 'primary';
    return 'warning';
  }

  async selectDayAction(dayKey: string) {
    const actionSheet = await this.actionSheetController.create({
      header: `Configurar ${this.daysOfWeek.find(d => d.key === dayKey)?.name}`,
      buttons: [
        {
          text: 'Definir como Descanso',
          icon: 'bed-outline',
          handler: () => this.setRestDay(dayKey)
        },
        {
          text: 'Atribuir Treino',
          icon: 'fitness-outline',
          handler: () => this.selectWorkoutForDay(dayKey)
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async setRestDay(dayKey: string) {
    try {
      this.workoutService.updateDayPlan(
        this.currentPlan!.id,
        dayKey as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', 
        { 
          type: 'rest',
          date: new Date().toISOString().split('T')[0],
          isRestDay: true,
          completed: false
        }
      ).subscribe(async () => {
        await this.loadData();
        await this.showToast('Dia de descanso definido!', 'success');
      });
    } catch (error) {
      console.error('Erro ao definir dia de descanso:', error);
      await this.showToast('Erro ao definir dia de descanso', 'danger');
    }
  }

  async selectWorkoutForDay(dayKey: string) {
    if (this.availableWorkouts.length === 0) {
      await this.showAlert(
        'Nenhum Treino Disponível',
        'Você precisa criar pelo menos um treino personalizado antes de planejar sua semana.'
      );
      return;
    }

    const alert = await this.alertController.create({
      header: 'Selecionar Treino',
      message: `Escolha um treino para ${this.daysOfWeek.find(d => d.key === dayKey)?.name}:`,
      inputs: this.availableWorkouts.map(workout => ({
        name: 'workout',
        type: 'radio',
        label: `${workout.name} (${workout.exercises.length} exercícios)`,
        value: workout.id
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: (workoutId) => {
            if (workoutId) {
              this.assignWorkoutToDay(dayKey, workoutId);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async assignWorkoutToDay(dayKey: string, workoutId: string) {
    try {
      const dayPlan: DayPlan = {
        type: 'workout',
        workoutId: workoutId,
        date: new Date().toISOString().split('T')[0],
        isRestDay: false,
        completed: false
      };
      
      this.workoutService.updateDayPlan(
        this.currentPlan!.id,
        dayKey as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
        dayPlan
      ).subscribe(async () => {
        await this.loadData();
        
        const workoutName = this.getWorkoutName(workoutId);
        await this.showToast(`${workoutName} atribuído para ${this.daysOfWeek.find(d => d.key === dayKey)?.name}!`, 'success');
      });
    } catch (error) {
      console.error('Erro ao atribuir treino:', error);
      await this.showToast('Erro ao atribuir treino', 'danger');
    }
  }

  async createNewPlan() {
    const alert = await this.alertController.create({
      header: 'Novo Plano Semanal',
      message: 'Digite um nome para seu novo plano semanal:',
      inputs: [
        {
          name: 'planName',
          type: 'text',
          placeholder: 'Ex: Plano Iniciante, Hipertrofia, etc.'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Criar',
          handler: async (data) => {
            if (data.planName && data.planName.trim()) {
              await this.createPlan(data.planName.trim());
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async createPlan(name: string) {
    try {
      await this.workoutService.createWeeklyPlan(name);
      await this.loadData();
      await this.showToast('Plano semanal criado!', 'success');
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      await this.showToast('Erro ao criar plano semanal', 'danger');
    }
  }

  async clearAllDays() {
    const alert = await this.alertController.create({
      header: 'Limpar Plano',
      message: 'Tem certeza que deseja limpar todos os dias? Esta ação não pode ser desfeita.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Limpar',
          cssClass: 'alert-button-danger',
          handler: async () => {
            await this.clearPlan();
          }
        }
      ]
    });

    await alert.present();
  }

  async clearPlan() {
    try {
      for (const day of this.daysOfWeek) {
        this.workoutService.updateDayPlan(
          this.currentPlan!.id,
          day.key as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
          { 
            type: 'rest',
            date: new Date().toISOString().split('T')[0],
            isRestDay: true,
            completed: false
          }
        ).subscribe();
      }
      await this.loadData();
      await this.showToast('Plano limpo com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao limpar plano:', error);
      await this.showToast('Erro ao limpar plano', 'danger');
    }
  }

  getTotalWorkoutDays(): number {
    if (!this.currentPlan) return 0;
    return Object.values(this.currentPlan.days).filter(day => day.type === 'workout').length;
  }

  getTotalRestDays(): number {
    return 7 - this.getTotalWorkoutDays();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
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
