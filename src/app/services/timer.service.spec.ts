import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TimerService, TimerState, WorkoutTimer } from './timer.service';

describe('TimerService', () => {
  let service: TimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimerService);
  });

  afterEach(() => {
    service.stopTimer();
    service.stopWorkoutTimer();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Timer functionality', () => {
    it('should start timer with correct initial state', (done) => {
      service.timer$.subscribe(state => {
        if (state.isRunning) {
          expect(state.currentTime).toBe(60);
          expect(state.targetTime).toBe(60);
          expect(state.type).toBe('rest');
          expect(state.exerciseName).toBe('Supino');
          expect(state.setNumber).toBe(1);
          expect(state.isPaused).toBe(false);
          done();
        }
      });

      service.startTimer(60, 'rest', 'Supino', 1);
    });

    it('should countdown timer correctly', fakeAsync(() => {
      let currentState: TimerState;
      
      service.timer$.subscribe(state => {
        currentState = state;
      });

      service.startTimer(3, 'rest');
      tick(1000);
      expect(currentState!.currentTime).toBe(2);
      
      tick(1000);
      expect(currentState!.currentTime).toBe(1);
      
      tick(1000);
      expect(currentState!.currentTime).toBe(0);
      expect(currentState!.isRunning).toBe(false);
    }));

    it('should pause and resume timer', fakeAsync(() => {
      let currentState: TimerState;
      
      service.timer$.subscribe(state => {
        currentState = state;
      });

      service.startTimer(10, 'rest');
      tick(2000);
      expect(currentState!.currentTime).toBe(8);

      service.pauseTimer();
      expect(currentState!.isPaused).toBe(true);
      
      tick(2000);
      expect(currentState!.currentTime).toBe(8); // Não deve diminuir quando pausado

      service.pauseTimer(); // Resume
      expect(currentState!.isPaused).toBe(false);
      
      tick(1000);
      expect(currentState!.currentTime).toBe(7);
    }));

    it('should stop timer', (done) => {
      service.timer$.subscribe(state => {
        if (!state.isRunning && state.currentTime === 0) {
          expect(state.targetTime).toBe(0);
          expect(state.type).toBe('rest');
          done();
        }
      });

      service.startTimer(60, 'exercise');
      service.stopTimer();
    });

    it('should add time to running timer', fakeAsync(() => {
      let currentState: TimerState;
      
      service.timer$.subscribe(state => {
        currentState = state;
      });

      service.startTimer(10, 'rest');
      tick(2000);
      expect(currentState!.currentTime).toBe(8);

      service.addTime(5);
      expect(currentState!.currentTime).toBe(13);

      service.addTime(-20); // Não deve ficar negativo
      expect(currentState!.currentTime).toBe(0);
    }));

    it('should not pause timer when not running', () => {
      let currentState: TimerState;
      
      service.timer$.subscribe(state => {
        currentState = state;
      });

      service.pauseTimer();
      expect(currentState!.isPaused).toBe(false);
      expect(currentState!.isRunning).toBe(false);
    });

    it('should not add time when timer not running', () => {
      let currentState: TimerState;
      
      service.timer$.subscribe(state => {
        currentState = state;
      });

      service.addTime(10);
      expect(currentState!.currentTime).toBe(0);
    });
  });

  describe('Workout Timer functionality', () => {
    it('should start workout timer', (done) => {
      service.workoutTimer$.subscribe(timer => {
        if (timer.isRunning) {
          expect(timer.totalTime).toBe(0);
          expect(timer.isPaused).toBe(false);
          expect(timer.startTime).toBeDefined();
          done();
        }
      });

      service.startWorkoutTimer();
    });

    it('should count workout time correctly', fakeAsync(() => {
      let currentTimer: WorkoutTimer;
      
      service.workoutTimer$.subscribe(timer => {
        currentTimer = timer;
      });

      service.startWorkoutTimer();
      tick(3000);
      
      expect(currentTimer!.totalTime).toBeGreaterThanOrEqual(2);
      expect(currentTimer!.totalTime).toBeLessThanOrEqual(4);
    }));

    it('should pause and resume workout timer', fakeAsync(() => {
      let currentTimer: WorkoutTimer;
      
      service.workoutTimer$.subscribe(timer => {
        currentTimer = timer;
      });

      service.startWorkoutTimer();
      tick(2000);
      const timeBeforePause = currentTimer!.totalTime;

      service.pauseWorkoutTimer();
      expect(currentTimer!.isPaused).toBe(true);
      
      tick(2000);
      expect(currentTimer!.totalTime).toBe(timeBeforePause);

      service.pauseWorkoutTimer(); // Resume
      expect(currentTimer!.isPaused).toBe(false);
      
      tick(1000);
      expect(currentTimer!.totalTime).toBeGreaterThan(timeBeforePause);
    }));

    it('should stop workout timer', (done) => {
      service.workoutTimer$.subscribe(timer => {
        if (!timer.isRunning && timer.totalTime === 0) {
          expect(timer.isPaused).toBe(false);
          expect(timer.startTime).toBeUndefined();
          done();
        }
      });

      service.startWorkoutTimer();
      service.stopWorkoutTimer();
    });

    it('should get workout duration', fakeAsync(() => {
      service.startWorkoutTimer();
      tick(5000);
      
      const duration = service.getWorkoutDuration();
      expect(duration).toBeGreaterThanOrEqual(4);
      expect(duration).toBeLessThanOrEqual(6);
    }));
  });

  describe('Time formatting', () => {
    it('should format time correctly with hours', () => {
      expect(service.formatTime(3661)).toBe('01:01:01');
      expect(service.formatTime(7320)).toBe('02:02:00');
    });

    it('should format time correctly without hours', () => {
      expect(service.formatTime(61)).toBe('01:01');
      expect(service.formatTime(125)).toBe('02:05');
      expect(service.formatTime(30)).toBe('00:30');
    });

    it('should format short time correctly', () => {
      expect(service.formatTimeShort(61)).toBe('1:01');
      expect(service.formatTimeShort(125)).toBe('2:05');
      expect(service.formatTimeShort(30)).toBe('0:30');
    });
  });

  describe('Time presets', () => {
    it('should return rest time presets', () => {
      const presets = service.getRestTimePresets();
      expect(presets).toBeDefined();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toEqual({ label: '30s', seconds: 30 });
      expect(presets.find(p => p.seconds === 60)).toBeDefined();
    });

    it('should return exercise time presets', () => {
      const presets = service.getExerciseTimePresets();
      expect(presets).toBeDefined();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toEqual({ label: '30s', seconds: 30 });
      expect(presets.find(p => p.seconds === 45)).toBeDefined();
    });
  });

  describe('Device features', () => {
    it('should handle vibration when supported', () => {
      const vibrateSpy = spyOn(navigator, 'vibrate').and.stub();
      
      service.vibrateDevice([100, 50, 100]);
      expect(vibrateSpy).toHaveBeenCalledWith([100, 50, 100]);
    });

    it('should handle vibration with default pattern', () => {
      const vibrateSpy = spyOn(navigator, 'vibrate').and.stub();
      
      service.vibrateDevice();
      expect(vibrateSpy).toHaveBeenCalledWith([200, 100, 200]);
    });

    it('should play sound without errors', () => {
      // Mock AudioContext
      const mockOscillator = {
        connect: jasmine.createSpy(),
        frequency: { setValueAtTime: jasmine.createSpy() },
        type: '',
        start: jasmine.createSpy(),
        stop: jasmine.createSpy()
      };
      
      const mockGainNode = {
        connect: jasmine.createSpy(),
        gain: {
          setValueAtTime: jasmine.createSpy(),
          exponentialRampToValueAtTime: jasmine.createSpy()
        }
      };

      const mockAudioContext = {
        createOscillator: jasmine.createSpy().and.returnValue(mockOscillator),
        createGain: jasmine.createSpy().and.returnValue(mockGainNode),
        destination: {},
        currentTime: 0
      };

      (window as any).AudioContext = jasmine.createSpy().and.returnValue(mockAudioContext);

      expect(() => service.playSound('start')).not.toThrow();
      expect(() => service.playSound('complete')).not.toThrow();
      expect(() => service.playSound('warning')).not.toThrow();
    });

    it('should handle sound errors gracefully', () => {
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;

      expect(() => service.playSound()).not.toThrow();
    });
  });

  describe('Notification permissions', () => {
    it('should request notification permission successfully', async () => {
      spyOnProperty(window, 'Notification', 'get').and.returnValue({
        requestPermission: jasmine.createSpy().and.returnValue(Promise.resolve('granted'))
      } as any);

      const result = await service.requestNotificationPermission();
      expect(result).toBe(true);
    });

    it('should handle denied notification permission', async () => {
      spyOnProperty(window, 'Notification', 'get').and.returnValue({
        requestPermission: jasmine.createSpy().and.returnValue(Promise.resolve('denied'))
      } as any);

      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('should handle when Notification API is not available', async () => {
      spyOnProperty(window, 'Notification', 'get').and.returnValue(null as any);

      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });
  });
});
