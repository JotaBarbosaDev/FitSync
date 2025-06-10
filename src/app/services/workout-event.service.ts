import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface WorkoutCompletedEvent {
  workoutId: string;
  sessionId: string;
  timestamp: Date;
  duration: number;
  caloriesBurned?: number;
  exercisesCompleted: number;
}

export interface WorkoutProgressUpdateEvent {
  type: 'workout_completed' | 'session_saved' | 'storage_updated';
  data: WorkoutCompletedEvent | Record<string, unknown>;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WorkoutEventService {
  private workoutCompletedSubject = new Subject<WorkoutCompletedEvent>();
  private progressUpdateSubject = new Subject<WorkoutProgressUpdateEvent>();

  // Observáveis públicos para components se inscreverem
  public workoutCompleted$ = this.workoutCompletedSubject.asObservable();
  public progressUpdate$ = this.progressUpdateSubject.asObservable();

  constructor() {
    console.log('WorkoutEventService initialized');
  }

  /**
   * Emite evento quando um treino é completado
   */
  emitWorkoutCompleted(event: WorkoutCompletedEvent): void {
    console.log('🎯 WorkoutEventService: Emitindo evento de treino completado:', event);
    this.workoutCompletedSubject.next(event);
    
    // Também emite o evento de atualização de progresso
    this.emitProgressUpdate({
      type: 'workout_completed',
      data: event,
      timestamp: new Date()
    });
  }

  /**
   * Emite evento quando há atualização nos dados de progresso
   */
  emitProgressUpdate(event: WorkoutProgressUpdateEvent): void {
    console.log('📊 WorkoutEventService: Emitindo evento de atualização de progresso:', event);
    this.progressUpdateSubject.next(event);
  }

  /**
   * Emite evento quando uma sessão é salva no storage
   */
  emitSessionSaved(sessionData: Record<string, unknown>): void {
    console.log('💾 WorkoutEventService: Emitindo evento de sessão salva:', sessionData);
    this.emitProgressUpdate({
      type: 'session_saved',
      data: sessionData,
      timestamp: new Date()
    });
  }

  /**
   * Emite evento quando dados são atualizados no storage
   */
  emitStorageUpdated(storageKey: string, data: unknown): void {
    console.log(`🔄 WorkoutEventService: Emitindo evento de storage atualizado [${storageKey}]:`, data);
    this.emitProgressUpdate({
      type: 'storage_updated',
      data: { storageKey, data },
      timestamp: new Date()
    });
  }
}
