import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  difficulty: string;
  duration: number;
  calories: number;
  equipment?: string;
  image: string;
  isFavorite: boolean;
  description: string;
  instructions: string[];
}

interface WorkoutSet {
  reps: number | null;
  weight: number | null;
  rpe: number | null; // Rate of Perceived Exertion (1-10)
  completed: boolean;
}

interface ExerciseHistory {
  date: Date;
  sets: WorkoutSet[];
  totalVolume: number;
  notes?: string;
}

interface RestTimer {
  timeLeft: number;
  running: boolean;
  interval?: any;
}

interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: "app-detalhe",
  templateUrl: "./detalhe.page.html",
  styleUrls: ["./detalhe.page.scss"],
  standalone: false,
})
export class DetalhePage implements OnInit, OnDestroy {  exercise: Exercise | null = null;
  relatedExercises: Exercise[] = [];
  workoutSets: WorkoutSet[] = [{ reps: null, weight: null, rpe: null, completed: false }];
  exerciseHistory: ExerciseHistory[] = [];
  restTimers: { [key: number]: RestTimer } = {};
  
  // Timer properties
  currentTime: number = 0;
  isTimerRunning: boolean = false;
  timerState: 'exercise' | 'rest' = 'exercise';
  timerInterval: any;
  exerciseTime: number = 45; // seconds
  restTime: number = 30; // seconds

  muscleGroups: MuscleGroup[] = [
    { id: 'chest', name: 'Peito', icon: 'body-outline', color: 'danger' },
    { id: 'back', name: 'Costas', icon: 'person-outline', color: 'success' },
    { id: 'legs', name: 'Pernas', icon: 'walk-outline', color: 'warning' },
    { id: 'shoulders', name: 'Ombros', icon: 'arrow-up-outline', color: 'tertiary' },
    { id: 'arms', name: 'Braços', icon: 'barbell-outline', color: 'secondary' },
    { id: 'core', name: 'Abdômen', icon: 'diamond-outline', color: 'medium' }
  ];

  // Mock exercises data (in a real app, this would come from a service)
  exercises: Exercise[] = [
    {
      id: '1',
      name: 'Supino Reto',
      muscleGroup: 'chest',
      difficulty: 'Intermediário',
      duration: 45,
      calories: 120,
      equipment: 'Barra',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      isFavorite: false,
      description: 'Exercício fundamental para desenvolvimento do peitoral. Trabalha principalmente o peitoral maior, deltoides anterior e tríceps.',
      instructions: [
        'Deite-se no banco com os pés apoiados no chão',
        'Segure a barra com pegada um pouco mais larga que os ombros',
        'Desça a barra controladamente até o peito',
        'Empurre a barra de volta à posição inicial'
      ]
    },
    {
      id: '2',
      name: 'Agachamento',
      muscleGroup: 'legs',
      difficulty: 'Iniciante',
      duration: 30,
      calories: 100,
      equipment: 'Peso Corporal',
      image: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      isFavorite: true,
      description: 'Exercício completo para membros inferiores. Fortalece quadríceps, glúteos, isquiotibiais e core.',
      instructions: [
        'Fique em pé com os pés afastados na largura dos ombros',
        'Desça como se fosse sentar em uma cadeira',
        'Mantenha o peito erguido e os joelhos alinhados',
        'Retorne à posição inicial'
      ]
    },
    // Add more exercises as needed
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    const exerciseId = this.route.snapshot.queryParams['exerciseId'] || this.route.snapshot.paramMap.get("id");
    if (exerciseId) {
      this.loadExercise(exerciseId);
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadExercise(exerciseId: string) {
    // In a real app, this would be a service call
    this.exercise = this.exercises.find(ex => ex.id === exerciseId) || null;
    if (this.exercise) {
      this.loadRelatedExercises();
    }
  }

  loadRelatedExercises() {
    if (!this.exercise) return;
    
    this.relatedExercises = this.exercises
      .filter(ex => ex.muscleGroup === this.exercise!.muscleGroup && ex.id !== this.exercise!.id)
      .slice(0, 3);
  }

  getMuscleGroupName(groupId: string): string {
    const group = this.muscleGroups.find(g => g.id === groupId);
    return group ? group.name : groupId;
  }

  async toggleFavorite() {
    if (!this.exercise) return;
    
    this.exercise.isFavorite = !this.exercise.isFavorite;
    
    const toast = await this.toastController.create({
      message: this.exercise.isFavorite ? 
        `${this.exercise.name} adicionado aos favoritos` : 
        `${this.exercise.name} removido dos favoritos`,
      duration: 2000,
      position: 'bottom',
      color: this.exercise.isFavorite ? 'success' : 'medium'
    });
    toast.present();
  }

  async shareExercise() {
    if (!this.exercise) return;
    
    // In a real app, this would use native sharing
    const toast = await this.toastController.create({
      message: `Compartilhando ${this.exercise.name}...`,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  // Timer methods
  startTimer() {
    this.isTimerRunning = true;
    this.currentTime = this.timerState === 'exercise' ? this.exerciseTime : this.restTime;
    
    this.timerInterval = setInterval(() => {
      this.currentTime--;
      
      if (this.currentTime <= 0) {
        this.switchTimerState();
      }
    }, 1000);
  }

  pauseTimer() {
    this.isTimerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  resetTimer() {
    this.pauseTimer();
    this.currentTime = this.timerState === 'exercise' ? this.exerciseTime : this.restTime;
  }

  switchTimerState() {
    if (this.timerState === 'exercise') {
      this.timerState = 'rest';
      this.currentTime = this.restTime;
    } else {
      this.timerState = 'exercise';
      this.currentTime = this.exerciseTime;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  // Workout tracking methods
  addSet() {
    this.workoutSets.push({ reps: null, weight: null, rpe: null, completed: false });
  }

  removeSet(index: number) {
    if (this.workoutSets.length > 1) {
      this.workoutSets.splice(index, 1);
    }
  }

  async saveWorkout() {
    const validSets = this.workoutSets.filter(set => set.reps && set.reps > 0);
    
    if (validSets.length === 0) {
      const alert = await this.alertController.create({
        header: 'Dados incompletos',
        message: 'Por favor, adicione pelo menos uma série com repetições.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // In a real app, this would save to a service/database
    const toast = await this.toastController.create({
      message: `Treino salvo! ${validSets.length} série(s) registradas.`,
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    toast.present();    // Reset workout tracking
    this.workoutSets = [{ reps: null, weight: null, rpe: null, completed: false }];
  }

  openRelatedExercise(exercise: Exercise) {
    this.router.navigate(['/detalhe'], { 
      queryParams: { exerciseId: exercise.id } 
    }).then(() => {
      this.loadExercise(exercise.id);
    });
  }

  // Advanced tracking methods
  onSetCompleted(setIndex: number) {
    const set = this.workoutSets[setIndex];
    if (set.completed && set.reps && set.weight) {
      // Auto-start rest timer if not the last set
      if (!this.isLastSet(setIndex)) {
        this.startRestTimer(setIndex);
      }
    }
  }

  isLastSet(setIndex: number): boolean {
    return setIndex === this.workoutSets.length - 1;
  }

  hasCompletedSets(): boolean {
    return this.workoutSets.some(set => set.completed && set.reps && set.weight);
  }

  getCompletedSets(): number {
    return this.workoutSets.filter(set => set.completed && set.reps && set.weight).length;
  }

  getTotalReps(): number {
    return this.workoutSets
      .filter(set => set.completed && set.reps)
      .reduce((total, set) => total + (set.reps || 0), 0);
  }

  getTotalVolume(): number {
    return this.workoutSets
      .filter(set => set.completed && set.reps && set.weight)
      .reduce((total, set) => total + ((set.reps || 0) * (set.weight || 0)), 0);
  }

  getAverageRPE(): string {
    const completedSetsWithRPE = this.workoutSets.filter(set => set.completed && set.rpe);
    if (completedSetsWithRPE.length === 0) return '0.0';
    
    const totalRPE = completedSetsWithRPE.reduce((sum, set) => sum + (set.rpe || 0), 0);
    return (totalRPE / completedSetsWithRPE.length).toFixed(1);
  }

  // Rest timer methods
  startRestTimer(setIndex: number) {
    const restTime = this.getRestTimeForSet(setIndex);
    
    if (this.restTimers[setIndex]) {
      clearInterval(this.restTimers[setIndex].interval);
    }

    this.restTimers[setIndex] = {
      timeLeft: restTime,
      running: true,
      interval: setInterval(() => {
        this.restTimers[setIndex].timeLeft--;
        
        if (this.restTimers[setIndex].timeLeft <= 0) {
          this.completeRestTimer(setIndex);
        }
      }, 1000)
    };
  }

  completeRestTimer(setIndex: number) {
    if (this.restTimers[setIndex]) {
      clearInterval(this.restTimers[setIndex].interval);
      this.restTimers[setIndex].running = false;
      
      // Play notification sound or vibration
      this.playNotification();
    }
  }

  getRestTimeForSet(setIndex: number): number {
    // Dynamic rest time based on exercise type and RPE
    const baseRestTime = 90; // seconds
    const set = this.workoutSets[setIndex];
    
    if (set.rpe && set.rpe >= 8) {
      return baseRestTime + 30; // Longer rest for high intensity
    } else if (set.rpe && set.rpe <= 5) {
      return baseRestTime - 30; // Shorter rest for low intensity
    }
    
    return baseRestTime;
  }

  // Performance tracking methods
  getLastWorkoutDate(): string {
    if (this.exerciseHistory.length === 0) return 'Nunca';
    
    const lastWorkout = this.exerciseHistory[this.exerciseHistory.length - 1];
    return lastWorkout.date.toLocaleDateString('pt-PT');
  }

  getBestSet(): string {
    if (this.exerciseHistory.length === 0) return 'Sem dados';
    
    let bestVolume = 0;
    let bestSet = '';
    
    this.exerciseHistory.forEach(workout => {
      workout.sets.forEach(set => {
        if (set.reps && set.weight) {
          const volume = set.reps * set.weight;
          if (volume > bestVolume) {
            bestVolume = volume;
            bestSet = `${set.reps} x ${set.weight}kg`;
          }
        }
      });
    });
    
    return bestSet || 'Sem dados';
  }

  getRecommendedWeight(): number {
    if (this.exerciseHistory.length === 0) return 0;
    
    // Calculate recommended weight based on last workout + progressive overload
    const lastWorkout = this.exerciseHistory[this.exerciseHistory.length - 1];
    const lastBestSet = lastWorkout.sets.reduce((best, set) => {
      if (!set.weight || !set.reps) return best;
      if (!best.weight || !best.reps) return set;
      
      const currentVolume = set.reps * set.weight;
      const bestVolume = best.reps * best.weight;
      
      return currentVolume > bestVolume ? set : best;
    }, { weight: 0, reps: 0 } as WorkoutSet);
    
    if (lastBestSet.weight) {
      // Progressive overload: +2.5% or +1.25kg minimum
      return Math.max(lastBestSet.weight + 1.25, lastBestSet.weight * 1.025);
    }
    
    return 0;
  }

  getRecommendedReps(): string {
    if (this.exerciseHistory.length === 0) return '8-12';
    
    // Base recommendation on exercise type and user's typical rep range
    const avgReps = this.exerciseHistory
      .flatMap(w => w.sets)
      .filter(s => s.reps)
      .reduce((sum, s, _, arr) => sum + (s.reps || 0) / arr.length, 0);
    
    const targetMin = Math.max(6, Math.floor(avgReps * 0.8));
    const targetMax = Math.min(15, Math.ceil(avgReps * 1.2));
    
    return `${targetMin}-${targetMax}`;
  }
  private playNotification() {
    // Vibration for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    
    // Audio notification could be added here
    console.log('Rest period completed!');
  }
}
