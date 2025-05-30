import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { AppData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dataSubject = new BehaviorSubject<AppData | null>(null);
  public data$ = this.dataSubject.asObservable();  constructor() {
    console.log('DataService: Construtor iniciado');
    this.loadInitialData().catch((error: Error) => {
      console.error('DataService: Erro crítico na inicialização:', error);
      // Fallback: criar dados básicos mesmo com erro
      this.createFallbackData();
    });
  }
  private async loadInitialData(): Promise<void> {
    console.log('DataService: loadInitialData iniciado');
    
    try {
      // Tentar carregar do localStorage primeiro
      this.loadFromLocalStorage();
      
      // Se não houver dados, criar dados iniciais básicos
      if (!this.dataSubject.value) {
        console.log('DataService: Nenhum dado encontrado, criando dados iniciais');
        
        const initialData: AppData = {
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
          users: [
            {
              id: "user_001",
              email: "demo@fitsync.app",
              name: "João Silva",
              height: 175,
              weight: 70,
              fitnessLevel: "beginner",
              goals: ["weightLoss", "strength"],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
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
        console.log('DataService: Dados iniciais criados com sucesso');
      } else {
        console.log('DataService: Dados carregados do localStorage');
      }
    } catch (error) {
      console.error('DataService: Erro ao carregar dados iniciais:', error);
      this.createFallbackData();
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
  updateDataSection(section: keyof AppData, newData: unknown[]): void {
    const currentData = this.getCurrentData();
    if (currentData) {
      (currentData[section] as unknown[]) = newData;
      this.saveData(currentData);
    }
  }

  // Método de fallback para criar dados básicos em caso de erro
  private createFallbackData(): void {
    console.log('DataService: Criando dados de fallback');
    const fallbackData: AppData = {
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
    
    this.dataSubject.next(fallbackData);
    localStorage.setItem('fitsync_data', JSON.stringify(fallbackData));
    console.log('DataService: Dados de fallback criados com sucesso');
  }
}
