import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

interface Exercise {
    id: string;
    name: string;
    category: string;
    muscleGroups: string[];
    equipment: string[];
    instructions: string;
    difficulty: string;
    duration: number;
    calories: number;
    emoji: string;
    description: string;
    completed?: boolean;
}

@Component({
    selector: 'app-workout-execution',
    templateUrl: './workout-execution.page.html',
    styleUrls: ['./workout-execution.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule]
})
export class WorkoutExecutionPage implements OnInit, OnDestroy {
    exercises: Exercise[] = [];
    dayName: string = '';
    source: string = '';
    currentExerciseIndex: number = 0;
    completedExercises: number = 0;
    loading = true;
    workoutStarted = false;

    // Timer para duração do treino
    workoutDuration = 0;
    private timerInterval: any;

    constructor(
        private route: ActivatedRoute,
        public router: Router,
        private alertController: AlertController,
        private toastController: ToastController
    ) { }

    ngOnInit() {
        this.loadExercisesFromParams();
    }

    ngOnDestroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    private loadExercisesFromParams() {
        this.route.queryParams.subscribe(params => {
            console.log('WorkoutExecutionPage: Parâmetros recebidos', params);

            if (params['exercises']) {
                try {
                    this.exercises = JSON.parse(params['exercises']);
                    this.dayName = params['dayName'] || 'Hoje';
                    this.source = params['source'] || 'unknown';

                    // Inicializar propriedade completed para todos os exercícios
                    this.exercises.forEach(exercise => {
                        exercise.completed = false;
                    });

                    console.log('Exercícios carregados:', this.exercises);
                    this.loading = false;
                } catch (error) {
                    console.error('Erro ao processar exercícios:', error);
                    this.showToast('Erro ao carregar exercícios do treino', 'danger');
                    this.router.navigate(['/tabs/home']);
                }
            } else {
                console.error('Nenhum exercício especificado');
                this.showToast('Nenhum exercício especificado', 'danger');
                this.router.navigate(['/tabs/home']);
            }
        });
    }

    // Iniciar o treino
    startWorkout() {
        this.workoutStarted = true;
        this.startTimer();
        this.showToast('Treino iniciado! Boa sorte! 💪', 'success');
    }

    // Obter o exercício atual
    get currentExercise(): Exercise | null {
        if (this.currentExerciseIndex >= 0 && this.currentExerciseIndex < this.exercises.length) {
            return this.exercises[this.currentExerciseIndex];
        }
        return null;
    }

    // Calcular progresso total
    get progressPercentage(): number {
        if (this.exercises.length === 0) return 0;
        return Math.round((this.completedExercises / this.exercises.length) * 100);
    }

    // Finalizar exercício atual
    async finishCurrentExercise() {
        if (!this.currentExercise) return;

        const alert = await this.alertController.create({
            header: 'Finalizar Exercício',
            message: `Você completou o exercício "${this.currentExercise.name}"?`,
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Sim, finalizar',
                    handler: () => {
                        this.completeCurrentExercise();
                    }
                }
            ]
        });

        await alert.present();
    }

    // Completar exercício atual
    completeCurrentExercise() {
        if (!this.currentExercise) return;

        // Marcar exercício como completo
        this.currentExercise.completed = true;
        this.completedExercises++;

        this.showToast(`Exercício "${this.currentExercise.name}" concluído! 🎉`, 'success');

        // Verificar se há mais exercícios
        if (this.currentExerciseIndex + 1 < this.exercises.length) {
            // Ir para o próximo exercício
            this.currentExerciseIndex++;
        } else {
            // Todos os exercícios foram completados
            this.completeWorkout();
        }
    }

    // Pular para o próximo exercício
    nextExercise() {
        if (this.currentExerciseIndex + 1 < this.exercises.length) {
            this.currentExerciseIndex++;
            this.showToast('Próximo exercício!', 'primary');
        }
    }

    // Voltar para o exercício anterior
    previousExercise() {
        if (this.currentExerciseIndex > 0) {
            this.currentExerciseIndex--;
            this.showToast('Exercício anterior', 'primary');
        }
    }

    // Finalizar treino completo
    async completeWorkout() {
        this.stopTimer();

        const alert = await this.alertController.create({
            header: '🎉 Parabéns!',
            message: `
        <div style="text-align: center;">
          <p><strong>Treino de ${this.dayName} concluído!</strong></p>
          <p>⏱️ Duração: ${this.formatDuration(this.workoutDuration)}</p>
          <p>💪 Exercícios completados: ${this.completedExercises}/${this.exercises.length}</p>
          <p>🔥 Calorias estimadas: ${this.getTotalCalories()}</p>
        </div>
      `,
            buttons: [
                {
                    text: 'Finalizar',
                    handler: () => {
                        this.router.navigate(['/tabs/home']);
                    }
                }
            ]
        });

        await alert.present();
    }

    // Finalizar treino a qualquer momento
    async finishWorkoutEarly() {
        const alert = await this.alertController.create({
            header: 'Finalizar Treino',
            message: `Você tem certeza que deseja finalizar o treino agora? Progresso atual: ${this.completedExercises}/${this.exercises.length} exercícios.`,
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Sim, finalizar',
                    handler: () => {
                        this.completeWorkout();
                    }
                }
            ]
        });

        await alert.present();
    }

    // Sair do treino
    async quitWorkout() {
        const alert = await this.alertController.create({
            header: 'Sair do Treino',
            message: 'Tem certeza que deseja sair? O progresso será perdido.',
            buttons: [
                {
                    text: 'Cancelar',
                    role: 'cancel'
                },
                {
                    text: 'Sair',
                    cssClass: 'alert-button-danger',
                    handler: () => {
                        this.stopTimer();
                        this.router.navigate(['/tabs/home']);
                    }
                }
            ]
        });

        await alert.present();
    }

    // Obter dificuldade em português
    getDifficultyLabel(difficulty: string): string {
        const labels: { [key: string]: string } = {
            'beginner': 'Iniciante',
            'intermediate': 'Intermediário',
            'advanced': 'Avançado'
        };
        return labels[difficulty] || difficulty;
    }

    // Obter cor da dificuldade
    getDifficultyColor(difficulty: string): string {
        const colors: { [key: string]: string } = {
            'beginner': 'success',
            'intermediate': 'warning',
            'advanced': 'danger'
        };
        return colors[difficulty] || 'medium';
    }

    // Calcular total de calorias
    getTotalCalories(): number {
        return this.exercises.reduce((total, exercise) => {
            return exercise.completed ? total + exercise.calories : total;
        }, 0);
    }

    // Timer functions
    private startTimer() {
        this.timerInterval = setInterval(() => {
            this.workoutDuration++;
        }, 1000);
    }

    private stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    // Formatear duração
    formatDuration(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        }
        return `${minutes}m ${remainingSeconds}s`;
    }

    // Mostrar toast
    private async showToast(message: string, color: string) {
        const toast = await this.toastController.create({
            message,
            duration: 2000,
            color,
            position: 'bottom'
        });
        await toast.present();
    }
}
