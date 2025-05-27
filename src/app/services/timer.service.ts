import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, Subscription } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number; // em segundos
  targetTime: number; // em segundos
  type: 'rest' | 'exercise' | 'workout';
  exerciseName?: string;
  setNumber?: number;
}

export interface WorkoutTimer {
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime?: Date;
  pausedTime?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private timerSubject = new BehaviorSubject<TimerState>({
    isRunning: false,
    isPaused: false,
    currentTime: 0,
    targetTime: 0,
    type: 'rest'
  });

  private workoutTimerSubject = new BehaviorSubject<WorkoutTimer>({
    totalTime: 0,
    isRunning: false,
    isPaused: false
  });

  private stopTimer$ = new Subject<void>();
  private timerSubscription?: Subscription;
  private workoutSubscription?: Subscription;

  public timer$ = this.timerSubject.asObservable();
  public workoutTimer$ = this.workoutTimerSubject.asObservable();

  constructor() {}

  // Timer de descanso/exercício
  startTimer(duration: number, type: 'rest' | 'exercise', exerciseName?: string, setNumber?: number): void {
    this.stopCurrentTimer();

    const timerState: TimerState = {
      isRunning: true,
      isPaused: false,
      currentTime: duration,
      targetTime: duration,
      type,
      exerciseName,
      setNumber
    };

    this.timerSubject.next(timerState);

    this.timerSubscription = interval(1000)
      .pipe(takeUntil(this.stopTimer$))
      .subscribe(() => {
        const current = this.timerSubject.value;
        if (current.isRunning && !current.isPaused) {
          const newTime = Math.max(0, current.currentTime - 1);
          
          this.timerSubject.next({
            ...current,
            currentTime: newTime
          });

          // Timer concluído
          if (newTime === 0) {
            this.onTimerComplete();
          }
        }
      });
  }

  pauseTimer(): void {
    const current = this.timerSubject.value;
    if (current.isRunning) {
      this.timerSubject.next({
        ...current,
        isPaused: !current.isPaused
      });
    }
  }

  stopTimer(): void {
    this.stopCurrentTimer();
    this.timerSubject.next({
      isRunning: false,
      isPaused: false,
      currentTime: 0,
      targetTime: 0,
      type: 'rest'
    });
  }

  addTime(seconds: number): void {
    const current = this.timerSubject.value;
    if (current.isRunning) {
      this.timerSubject.next({
        ...current,
        currentTime: Math.max(0, current.currentTime + seconds)
      });
    }
  }

  // Timer do workout (cronômetro)
  startWorkoutTimer(): void {
    this.stopWorkoutTimer();

    const workoutTimer: WorkoutTimer = {
      totalTime: 0,
      isRunning: true,
      isPaused: false,
      startTime: new Date()
    };

    this.workoutTimerSubject.next(workoutTimer);

    this.workoutSubscription = interval(1000)
      .pipe(takeUntil(this.stopTimer$))
      .subscribe(() => {
        const current = this.workoutTimerSubject.value;
        if (current.isRunning && !current.isPaused && current.startTime) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - current.startTime.getTime()) / 1000);
          const pausedTime = current.pausedTime || 0;
          
          this.workoutTimerSubject.next({
            ...current,
            totalTime: elapsed - pausedTime
          });
        }
      });
  }

  pauseWorkoutTimer(): void {
    const current = this.workoutTimerSubject.value;
    if (current.isRunning) {
      if (!current.isPaused) {
        // Pausar: salvar tempo atual
        this.workoutTimerSubject.next({
          ...current,
          isPaused: true,
          pausedTime: (current.pausedTime || 0)
        });
      } else {
        // Retomar: ajustar tempo de início
        const now = new Date();
        const pauseDuration = current.pausedTime || 0;
        
        this.workoutTimerSubject.next({
          ...current,
          isPaused: false,
          startTime: new Date(now.getTime() - (current.totalTime * 1000)),
          pausedTime: 0
        });
      }
    }
  }

  stopWorkoutTimer(): void {
    if (this.workoutSubscription) {
      this.workoutSubscription.unsubscribe();
    }

    this.workoutTimerSubject.next({
      totalTime: 0,
      isRunning: false,
      isPaused: false
    });
  }

  getWorkoutDuration(): number {
    return this.workoutTimerSubject.value.totalTime;
  }

  // Métodos auxiliares
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  formatTimeShort(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Presets de tempo comuns
  getRestTimePresets(): { label: string, seconds: number }[] {
    return [
      { label: '30s', seconds: 30 },
      { label: '1min', seconds: 60 },
      { label: '1min 30s', seconds: 90 },
      { label: '2min', seconds: 120 },
      { label: '3min', seconds: 180 },
      { label: '5min', seconds: 300 }
    ];
  }

  getExerciseTimePresets(): { label: string, seconds: number }[] {
    return [
      { label: '30s', seconds: 30 },
      { label: '45s', seconds: 45 },
      { label: '1min', seconds: 60 },
      { label: '2min', seconds: 120 },
      { label: '3min', seconds: 180 },
      { label: '5min', seconds: 300 }
    ];
  }

  // Vibração e notificações
  vibrateDevice(pattern: number[] = [200, 100, 200]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  playSound(type: 'start' | 'complete' | 'warning' = 'complete'): void {
    // Implementação básica com Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Diferentes frequências para diferentes tipos
      switch (type) {
        case 'start':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
          break;
        case 'warning':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          break;
      }

      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Não foi possível reproduzir som:', error);
    }
  }

  // Eventos privados
  private stopCurrentTimer(): void {
    this.stopTimer$.next();
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  private onTimerComplete(): void {
    const current = this.timerSubject.value;
    
    // Efeitos de conclusão
    this.vibrateDevice();
    this.playSound('complete');

    // Notificação
    if ('Notification' in window && Notification.permission === 'granted') {
      let message = 'Timer concluído!';
      if (current.type === 'rest') {
        message = 'Tempo de descanso terminado!';
      } else if (current.type === 'exercise' && current.exerciseName) {
        message = `Tempo do exercício ${current.exerciseName} terminado!`;
      }

      new Notification('FitSync', {
        body: message,
        icon: '/assets/icon/favicon.png'
      });
    }

    this.stopTimer();
  }

  // Solicitar permissão para notificações
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.stopWorkoutTimer();
    this.stopTimer$.complete();
  }
}
