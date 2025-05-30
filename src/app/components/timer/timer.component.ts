import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-timer',
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss'],
  standalone: false
})
export class TimerComponent implements OnInit, OnDestroy {
  @Input() initialTime: number = 0; // in seconds
  @Input() autoStart: boolean = false;
  @Input() countDown: boolean = false;
  @Input() displayFormat: 'seconds' | 'minutes' | 'hours' = 'minutes';
  
  @Output() timeChanged = new EventEmitter<number>();
  @Output() timerFinished = new EventEmitter<void>();
  @Output() timerStarted = new EventEmitter<void>();
  @Output() timerPaused = new EventEmitter<void>();
  @Output() timerReset = new EventEmitter<void>();

  currentTime: number = 0;
  isRunning: boolean = false;
  isPaused: boolean = false;
  private intervalId?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.currentTime = this.initialTime;
    
    if (this.autoStart) {
      this.start();
    }
  }

  ngOnDestroy() {
    this.stop();
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.isPaused = false;
      this.timerStarted.emit();
      
      this.intervalId = setInterval(() => {
        if (this.countDown) {
          this.currentTime--;
          if (this.currentTime <= 0) {
            this.currentTime = 0;
            this.finish();
          }
        } else {
          this.currentTime++;
        }
        
        this.timeChanged.emit(this.currentTime);
      }, 1000);
    }
  }

  pause() {
    if (this.isRunning) {
      this.isRunning = false;
      this.isPaused = true;
      this.timerPaused.emit();
      clearInterval(this.intervalId);
    }
  }

  resume() {
    if (this.isPaused) {
      this.start();
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.intervalId);
  }

  reset() {
    this.stop();
    this.currentTime = this.initialTime;
    this.timerReset.emit();
  }

  finish() {
    this.stop();
    this.timerFinished.emit();
  }

  addTime(seconds: number) {
    this.currentTime += seconds;
    if (this.currentTime < 0) {
      this.currentTime = 0;
    }
  }

  setTime(seconds: number) {
    this.currentTime = seconds;
    if (this.currentTime < 0) {
      this.currentTime = 0;
    }
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    switch (this.displayFormat) {
      case 'hours':
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      case 'minutes':
        const totalMinutes = Math.floor(seconds / 60);
        return `${totalMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      case 'seconds':
      default:
        return seconds.toString();
    }
  }

  getDisplayTime(): string {
    return this.formatTime(this.currentTime);
  }

  getProgressPercentage(): number {
    if (!this.countDown || this.initialTime === 0) {
      return 0;
    }
    return ((this.initialTime - this.currentTime) / this.initialTime) * 100;
  }
}
