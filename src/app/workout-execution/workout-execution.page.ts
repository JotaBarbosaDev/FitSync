import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ProgressDataService } from '../services/progress-data.service';
import { StorageService } from '../services/storage.service';
import { WorkoutEventService } from '../services/workout-event.service';
import { CalorieCalculationService, UserData, ExerciseCalorieData } from '../services/calorie-calculation.service';
import { OrientationService } from '../services/orientation.service';

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  instructions: string;
  difficulty: string;
  duration?: number;
  calories?: number;
  emoji?: string;
  description?: string;
  completed?: boolean;
}

@Component({
  selector: 'app-workout-execution',
  templateUrl: './workout-execution.page.html',
  styleUrls: ['./workout-execution.page.scss'],
  standalone: false
})
export class WorkoutExecutionPage implements OnInit, OnDestroy {
  // Propriedades principais
  exercises: Exercise[] = [];
  dayName: string = '';
  source: string = '';
  currentExerciseIndex: number = 0;
  completedExercises: number = 0;
  isWorkoutStarted: boolean = false;
  isWorkoutCompleted: boolean = false;
  workoutDuration: number = 0;
  private workoutTimer: any;
  private workoutStartTime: Date | null = null;
  private completedExerciseData: any[] = [];
  
  // Getters for template compatibility
  get workoutStarted(): boolean {
    return this.isWorkoutStarted;
  }
  
  get workoutCompleted(): boolean {
    return this.isWorkoutCompleted;
  }

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private progressDataService: ProgressDataService,
    private storageService: StorageService,
    private calorieCalculationService: CalorieCalculationService,
    private workoutEventService: WorkoutEventService,
    private orientationService: OrientationService
  ) { }

  ngOnInit() {
    this.loadExercisesFromUrl();
    this.progressDataService.init();
    
    // Bloquear orientação em portrait durante o treino
    this.lockOrientation();
  }

  ngOnDestroy() {
    this.stopTimer();
    
    // Desbloquear orientação ao sair da tela
    this.unlockOrientation();
  }

  private loadExercisesFromUrl() {
    this.route.queryParams.subscribe(params => {
      try {
        if (params['exercises']) {
          this.exercises = JSON.parse(decodeURIComponent(params['exercises']));
          this.exercises = this.exercises.map(ex => ({ ...ex, completed: false }));
        }
        this.dayName = params['dayName'] || 'Hoje';
        this.source = params['source'] || 'unknown';

        console.log('Exercícios carregados:', this.exercises);
        console.log('Dia:', this.dayName);
        console.log('Origem:', this.source);
      } catch (error) {
        console.error('Erro ao parsear exercícios da URL:', error);
        this.showErrorToast('Erro ao carregar exercícios. Verifique os dados.');
        this.router.navigate(['/tabs/home']);
      }
    });
  }

  startWorkout() {
    if (this.exercises.length === 0) {
      this.showErrorToast('Nenhum exercício disponível para treino.');
      return;
    }

    this.isWorkoutStarted = true;
    this.workoutDuration = 0;
    this.workoutStartTime = new Date();
    this.completedExerciseData = [];
    this.startTimer();
    console.log('Treino iniciado!');
  }

  private startTimer() {
    this.workoutTimer = setInterval(() => {
      this.workoutDuration++;
    }, 1000);
  }

  private stopTimer() {
    if (this.workoutTimer) {
      clearInterval(this.workoutTimer);
      this.workoutTimer = null;
    }
  }

  finishCurrentExercise() {
    if (this.currentExerciseIndex < this.exercises.length) {
      this.completeCurrentExercise();
    }
  }

  private async completeCurrentExercise() {
    if (this.currentExerciseIndex < this.exercises.length) {
      const currentExercise = this.exercises[this.currentExerciseIndex];
      currentExercise.completed = true;
      this.completedExercises++;

      // Salvar dados do exercício completado
      const exerciseData = {
        exerciseId: currentExercise.id,
        exerciseName: currentExercise.name,
        muscleGroup: currentExercise.muscleGroups[0] || 'unknown',
        completedAt: new Date(),
        duration: currentExercise.duration || 0,
        calories: currentExercise.calories || 0,
        difficulty: currentExercise.difficulty,
        // Simular dados de séries - em uma implementação real, você coletaria esses dados do usuário
        sets: [
          { reps: 12, weight: 0, rpe: 7 },
          { reps: 10, weight: 0, rpe: 8 },
          { reps: 8, weight: 0, rpe: 9 }
        ]
      };

      this.completedExerciseData.push(exerciseData);

      const toast = await this.toastController.create({
        message: `✅ ${currentExercise.name} concluído!`,
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      // Se não é o último exercício, vai para o próximo
      if (this.currentExerciseIndex < this.exercises.length - 1) {
        this.currentExerciseIndex++;
      } else {
        // Se é o último exercício, finaliza o treino
        this.completeWorkout();
      }
    }
  }

  private async completeWorkout() {
    this.isWorkoutCompleted = true;
    this.stopTimer();

    // Salvar sessão de treino no sistema de progresso
    await this.saveWorkoutSession();

    
  }

  async finishWorkout() {
    const alert = await this.alertController.create({
      header: 'Finalizar Treino',
      message: 'Tem certeza que deseja finalizar o treino agora?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Finalizar',
          handler: async () => {
            // Salvar dados mesmo para treino incompleto
            if (this.completedExerciseData.length > 0) {
              await this.saveWorkoutSession();
            }
            this.completeWorkout();
          }
        }
      ]
    });
    await alert.present();
  }

  async goBack() {
    if (this.isWorkoutStarted && !this.isWorkoutCompleted) {
      const alert = await this.alertController.create({
        header: 'Abandonar Treino',
        message: 'Tem certeza que deseja sair? O progresso será perdido.',
        buttons: [
          {
            text: 'Continuar Treino',
            role: 'cancel'
          },
          {
            text: 'Sair',
            handler: () => {
              this.router.navigate(['/tabs/home']);
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.router.navigate(['/tabs/home']);
    }
  }

  // Getters para a template
  get currentExercise(): Exercise | null {
    return this.exercises[this.currentExerciseIndex] || null;
  }

  getCurrentExercise(): Exercise | null {
    return this.currentExercise;
  }

  get progressPercentage(): number {
    if (this.exercises.length === 0) return 0;
    const currentProgress = this.currentExerciseIndex + 1;
    return Math.round((currentProgress / this.exercises.length) * 100);
  }

  get totalExercises(): number {
    return this.exercises.length;
  }

  get currentExerciseNumber(): number {
    return this.currentExerciseIndex + 1;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'iniciante':
      case 'beginner':
        return 'success';
      case 'intermediário':
      case 'intermediate':
        return 'warning';
      case 'avançado':
      case 'advanced':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      arms: 'barbell-outline',
      chest: 'fitness-outline',
      legs: 'walk-outline',
      back: 'body-outline',
      shoulders: 'triangle-outline',
      cardio: 'heart-outline',
      core: 'radio-button-on-outline'
    };
    return icons[category] || 'fitness-outline';
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Additional methods referenced in template
  getTotalCalories(): number {
    // Obter dados do usuário para o cálculo
    const userData = this.getUserDataForCalculations();
    
    return this.exercises.reduce((total, exercise) => {
      const caloriesForExercise = this.calculateExerciseCalories(exercise, userData);
      return total + caloriesForExercise;
    }, 0);
  }

  private getUserDataForCalculations(): UserData {
    // Por enquanto, usar dados padrão. Futuramente, isso virá do perfil do usuário
    return this.calorieCalculationService.getDefaultUserData();
  }

  private calculateExerciseCalories(exercise: Exercise, userData: UserData): number {
    const exerciseData: ExerciseCalorieData = {
      type: this.mapExerciseTypeFromCategory(exercise.category),
      intensity: this.mapIntensityFromDifficulty(exercise.difficulty),
      duration: exercise.duration || 3,
      muscleGroups: exercise.muscleGroups || ['unknown'],
      difficulty: this.mapDifficultyLevel(exercise.difficulty),
      equipment: exercise.equipment
    };

    return this.calorieCalculationService.calculateExerciseCalories(exerciseData, userData);
  }

  private mapExerciseTypeFromCategory(category: string): 'strength' | 'cardio' | 'flexibility' | 'mixed' {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('cardio') || categoryLower.includes('aeróbico')) {
      return 'cardio';
    }
    if (categoryLower.includes('flex') || categoryLower.includes('alongamento') || categoryLower.includes('yoga')) {
      return 'flexibility';
    }
    if (categoryLower.includes('funcional') || categoryLower.includes('circuit') || categoryLower.includes('hiit')) {
      return 'mixed';
    }
    
    return 'strength'; // padrão para musculação
  }

  private mapIntensityFromDifficulty(difficulty: string): 'low' | 'moderate' | 'high' | 'very_high' {
    switch (difficulty?.toLowerCase()) {
      case 'fácil':
      case 'easy':
      case 'beginner':
        return 'low';
      case 'médio':
      case 'medium':
      case 'intermediate':
        return 'moderate';
      case 'difícil':
      case 'hard':
      case 'advanced':
        return 'high';
      default:
        return 'moderate';
    }
  }

  private mapDifficultyLevel(difficulty: string): 'beginner' | 'intermediate' | 'advanced' {
    switch (difficulty?.toLowerCase()) {
      case 'fácil':
      case 'easy':
        return 'beginner';
      case 'difícil':
      case 'hard':
        return 'advanced';
      default:
        return 'intermediate';
    }
  }

  getTotalMinutes(): number {
    return this.exercises.reduce((total, exercise) => total + (exercise.duration || 3), 0);
  }

  getFormattedTotalMinutes(): string {
    const totalMinutes = this.getTotalMinutes();
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}h` : `${hours}h`;
    } else {
      return `${totalMinutes}min`;
    }
  }

  getTotalExercises(): number {
    return this.exercises.length;
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
      case 'iniciante':
        return 'Iniciante';
      case 'intermediate':
      case 'intermediário':
        return 'Intermediário';
      case 'advanced':
      case 'avançado':
        return 'Avançado';
      default:
        return 'Intermediário';
    }
  }

  previousExercise() {
    if (this.currentExerciseIndex > 0) {
      this.currentExerciseIndex--;
    }
  }

  nextExercise() {
    if (this.currentExerciseIndex < this.exercises.length - 1) {
      this.currentExerciseIndex++;
    }
  }

  async repeatWorkout() {
    const alert = await this.alertController.create({
      header: '🔄 Repetir Treino',
      message: 'Deseja repetir este treino? Todos os exercícios serão reiniciados.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sim, repetir',
          handler: () => {
            this.restartWorkout();
          }
        }
      ]
    });

    await alert.present();
  }

  private restartWorkout() {
    // Reset all exercise completion status
    this.exercises = this.exercises.map(exercise => ({
      ...exercise,
      completed: false
    }));

    // Reset workout state
    this.currentExerciseIndex = 0;
    this.completedExercises = 0;
    this.isWorkoutCompleted = false;
    this.workoutDuration = 0;
    this.workoutStartTime = null;
    this.completedExerciseData = [];

    // Stop any existing timer
    this.stopTimer();

    // Show success message
    this.showToast('🔄 Treino reiniciado! Vamos começar novamente!', 'success');

    // Auto-start the workout
    setTimeout(() => {
      this.startWorkout();
    }, 500);
  }

  private async saveWorkoutSession() {
    if (!this.workoutStartTime) return;

    try {
      // Calcular duração total
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - this.workoutStartTime.getTime()) / 60000);

      // Calcular volume total
      const totalVolume = this.completedExerciseData.reduce((total, exercise) => {
        return total + exercise.sets.reduce((setTotal: number, set: any) => {
          return setTotal + (set.reps * set.weight);
        }, 0);
      }, 0);

      // Calcular calorias usando o CalorieCalculationService
      const userData = this.getUserDataForCalculations();
      const totalCalories = this.calculateWorkoutSessionCalories(userData, durationMinutes);

      // Garantir que a duração seja pelo menos 1 minuto
      const finalDuration = Math.max(durationMinutes, 1);

      // Criar dados da sessão para o ProgressDataService
      const workoutSession = {
        date: this.workoutStartTime.toISOString(),
        exercises: this.completedExerciseData.map(exercise => ({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets,
          totalVolume: exercise.sets.reduce((total: number, set: any) => total + (set.reps * set.weight), 0),
          muscleGroup: exercise.muscleGroup
        })),
        duration: finalDuration,
        totalVolume: totalVolume,
        muscleGroups: [...new Set(this.completedExerciseData.map(ex => ex.muscleGroup))],
        notes: `${this.dayName} - ${this.completedExercises} exercícios completados - ${totalCalories} calorias queimadas`
      };

      // Salvar usando o ProgressDataService
      await this.progressDataService.addWorkoutSession(workoutSession);

      // TAMBÉM salvar no formato antigo para compatibilidade
      const legacySession = {
        id: `session_${Date.now()}`,
        workoutId: `workout_${this.dayName}`,
        startTime: this.workoutStartTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: finalDuration,
        caloriesBurned: totalCalories,
        completedExercises: this.completedExerciseData.map(ex => ex.exerciseId),
        rating: 5,
        notes: `${this.dayName} completado`,
        status: 'completed'
      };

      // Salvar no formato antigo
      const existingSessions = (await this.storageService.get('workoutSessions')) || [];
      if (Array.isArray(existingSessions)) {
        existingSessions.push(legacySession);
      } else {
        console.warn('existingSessions não é um array, criando novo array');
      }
      await this.storageService.set('workoutSessions', Array.isArray(existingSessions) ? existingSessions : [legacySession]);

      console.log('Sessão salva em ambos os formatos:', {
        progressDataService: workoutSession,
        legacy: legacySession,
        totalCalories,
        finalDuration
      });

      // Mostrar toast de confirmação
      const toast = await this.toastController.create({
        message: '✅ Dados do treino salvos com sucesso!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      // 🎯 EMITIR EVENTO DE TREINO COMPLETADO
      this.workoutEventService.emitWorkoutCompleted({
        workoutId: legacySession.workoutId,
        sessionId: legacySession.id,
        timestamp: new Date(),
        duration: finalDuration,
        caloriesBurned: totalCalories,
        exercisesCompleted: this.completedExerciseData.length
      });

      // 📊 EMITIR EVENTO DE SESSÃO SALVA
      this.workoutEventService.emitSessionSaved(legacySession);

      console.log('🎉 Eventos de treino completado emitidos com sucesso!');

    } catch (error) {
      console.error('Erro ao salvar sessão de treino:', error);

      const toast = await this.toastController.create({
        message: '⚠️ Erro ao salvar dados do treino',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
    }
  }

  private calculateWorkoutSessionCalories(userData: UserData, durationMinutes: number): number {
    // Criar lista de exercícios realizados com dados para cálculo de calorias
    const exercisesData: ExerciseCalorieData[] = this.completedExerciseData.map(completedExercise => {
      // Encontrar o exercício original para obter os dados
      const originalExercise = this.exercises.find(ex => ex.id === completedExercise.exerciseId);
      
      if (!originalExercise) {
        // Fallback para exercício desconhecido
        return {
          type: 'strength',
          intensity: 'moderate',
          duration: 3,
          muscleGroups: ['unknown'],
          difficulty: 'intermediate'
        };
      }

      return {
        type: this.mapExerciseTypeFromCategory(originalExercise.category),
        intensity: this.mapIntensityFromDifficulty(originalExercise.difficulty),
        duration: originalExercise.duration || 3,
        muscleGroups: originalExercise.muscleGroups || ['unknown'],
        difficulty: this.mapDifficultyLevel(originalExercise.difficulty),
        equipment: originalExercise.equipment
      };
    });

    // Calcular tempo de descanso estimado (assumindo 60 segundos entre séries)
    const estimatedRestTime = this.completedExerciseData.reduce((total, exercise) => {
      const setsCount = exercise.sets.length;
      return total + (setsCount > 1 ? (setsCount - 1) * 1 : 0); // 1 minuto entre séries
    }, 0);

    // Criar dados da sessão
    const sessionData = {
      exercises: exercisesData,
      totalDuration: durationMinutes,
      restTime: estimatedRestTime,
      intensity: this.determineSessionIntensity(exercisesData)
    };

    return this.calorieCalculationService.calculateWorkoutSessionCalories(sessionData, userData);
  }

  private determineSessionIntensity(exercises: ExerciseCalorieData[]): 'low' | 'moderate' | 'high' | 'very_high' {
    if (exercises.length === 0) return 'moderate';

    // Calcular intensidade média baseada nos exercícios
    const intensityValues = {
      'low': 1,
      'moderate': 2,
      'high': 3,
      'very_high': 4
    };

    const totalIntensity = exercises.reduce((sum, exercise) => {
      return sum + intensityValues[exercise.intensity];
    }, 0);

    const averageIntensity = totalIntensity / exercises.length;

    if (averageIntensity >= 3.5) return 'very_high';
    if (averageIntensity >= 2.5) return 'high';
    if (averageIntensity >= 1.5) return 'moderate';
    return 'low';
  }

  // Métodos para controle de orientação
  private async lockOrientation(): Promise<void> {
    try {
      await this.orientationService.lockToPortrait();
      console.log('✅ Orientação bloqueada em portrait durante o treino');
    } catch (error) {
      console.error('❌ Erro ao bloquear orientação:', error);
    }
  }

  private async unlockOrientation(): Promise<void> {
    try {
      await this.orientationService.unlockOrientation();
      console.log('✅ Orientação desbloqueada ao sair do treino');
    } catch (error) {
      console.error('❌ Erro ao desbloquear orientação:', error);
    }
  }

  // Método para refresh da página
  async onRefreshWorkout(): Promise<void> {
    try {
      console.log('🔄 Atualizando treino...');
      
      // Recarregar dados dos exercícios se necessário
      this.loadExercisesFromUrl();
      
      // Resetar estados se o treino não estiver em andamento
      if (!this.isWorkoutStarted) {
        this.currentExerciseIndex = 0;
        this.completedExercises = 0;
        this.workoutDuration = 0;
      }
      
      // Mostrar feedback para o usuário
      const toast = await this.toastController.create({
        message: '✅ Treino atualizado!',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
      
    } catch (error) {
      console.error('❌ Erro ao atualizar treino:', error);
      
      const toast = await this.toastController.create({
        message: '❌ Erro ao atualizar. Tente novamente.',
        duration: 3000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }
}
