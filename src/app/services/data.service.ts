import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { AppData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dataSubject = new BehaviorSubject<AppData | null>(null);
  public data$ = this.dataSubject.asObservable();  constructor() {
    this.loadInitialData();
  }
  private async loadInitialData(): Promise<void> {
    try {
      // Tentar carregar do localStorage primeiro
      this.loadFromLocalStorage();
      
      // Se não houver dados, criar dados iniciais básicos
      if (!this.dataSubject.value) {        const initialData: AppData = {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
          users: [],
          plans: [],
          days: [],
          workouts: [],
          exercises: [],
          sets: [],
          workoutSessions: [],
          exerciseLibrary: []
        };
        this.dataSubject.next(initialData);
        localStorage.setItem('fitsync_data', JSON.stringify(initialData));
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      this.loadFromLocalStorage();
    }
  }

  loadData(): Observable<AppData | null> {
    const savedData = localStorage.getItem('fitsync_data');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        this.dataSubject.next(data);
        return of(data);
      } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
      }
    }
    return this.data$;
  }

  private loadFromLocalStorage(): void {
    const savedData = localStorage.getItem('fitsync_data');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        this.dataSubject.next(data);
      } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
      }
    }
  }

  async saveData(data: AppData): Promise<boolean> {
    try {
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem('fitsync_data', JSON.stringify(data));
      this.dataSubject.next(data);
      return true;
    } catch (error) {
      console.error('Erro ao guardar dados:', error);
      return false;
    }
  }

  async exportData(): Promise<string> {
    const currentData = this.dataSubject.value;
    if (currentData) {
      return JSON.stringify(currentData, null, 2);
    }
    throw new Error('Nenhum dado disponível para exportar');
  }

  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      return await this.saveData(data);
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return false;
    }
  }

  getCurrentData(): AppData | null {
    return this.dataSubject.value;
  }

  // Método para gerar IDs únicos
  generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Método para atualizar dados específicos
  updateDataSection(section: keyof AppData, newData: any[]): void {
    const currentData = this.getCurrentData();
    if (currentData) {
      currentData[section] = newData as any;
      this.saveData(currentData);
    }
  }
}
