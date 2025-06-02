import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { AppData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dataSubject = new BehaviorSubject<AppData | null>(null);
  public data$ = this.dataSubject.asObservable();
  
  private _storage: Storage | null = null;

  constructor(private storage: Storage) {
    console.log('DataService: Construtor iniciado');
    this.init();
  }

  private async init() {
    try {
      const storage = await this.storage.create();
      this._storage = storage;
      await this.loadInitialData();
    } catch (error) {
      console.error('DataService: Erro crítico na inicialização:', error);
      this.createFallbackData();
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      await this.loadFromStorage();
      if (!this.dataSubject.value) {
        await this.createInitialData();
      }
    } catch (error) {
      console.error('DataService: Erro ao carregar dados iniciais:', error);
      this.createFallbackData();
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      if (this._storage) {
        const data = await this._storage.get('fitSyncData');
        if (data) {
          // Migração: adicionar password a usuários existentes
          const migratedData = this.migrateUserPasswords(data);
          this.dataSubject.next(migratedData);
          
          // Salvar dados migrados se houve mudanças
          if (migratedData !== data) {
            await this.saveToStorage(migratedData);
          }
          return;
        }
      }
      
      const localData = localStorage.getItem('fitSyncData');
      if (localData) {
        const parsedData = JSON.parse(localData);
        // Migração: adicionar password a usuários existentes
        const migratedData = this.migrateUserPasswords(parsedData);
        this.dataSubject.next(migratedData);
        
        if (this._storage) {
          await this._storage.set('fitSyncData', migratedData);
        }
      }
    } catch (error) {
      console.error('DataService: Erro ao carregar do storage:', error);
    }
  }

  private migrateUserPasswords(data: any): any {
    if (!data || !data.users) return data;
    
    let hasChanges = false;
    const migratedUsers = data.users.map((user: any) => {
      if (!user.password) {
        hasChanges = true;
        // Para usuário demo, usar senha demo123, para outros usar senha padrão
        const defaultPassword = user.email === 'demo@fitsync.app' ? 'demo123' : 'password123';
        return { ...user, password: defaultPassword };
      }
      return user;
    });
    
    if (hasChanges) {
      console.log('DataService: Migração de passwords aplicada');
      return { ...data, users: migratedUsers };
    }
    
    return data;
  }

  private async saveToStorage(data: AppData): Promise<void> {
    try {
      if (this._storage) {
        await this._storage.set('fitSyncData', data);
      } else {
        localStorage.setItem('fitSyncData', JSON.stringify(data));
      }
    } catch (error) {
      console.error('DataService: Erro ao salvar no storage:', error);
      localStorage.setItem('fitSyncData', JSON.stringify(data));
    }
  }

  private async createInitialData(): Promise<void> {
    const initialData: AppData = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      users: [],
      plans: [],
      days: [],
      workouts: [],
      exercises: [],
      sets: [],
      workoutSessions: [],
      exerciseLibrary: [],
      // Novos dados para sistema de treinos
      customWorkouts: [],
      weeklyPlans: [],
      workoutSessions2: [],
      workoutProgress: [],
      dayPlans: []
    };

    this.dataSubject.next(initialData);
    await this.saveToStorage(initialData);
  }

  private createFallbackData(): void {
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
      exerciseLibrary: [],
      // Novos dados para sistema de treinos
      customWorkouts: [],
      weeklyPlans: [],
      workoutSessions2: [],
      workoutProgress: [],
      dayPlans: []
    };

    this.dataSubject.next(fallbackData);
    this.saveToStorage(fallbackData).catch(error => {
      console.error('DataService: Erro ao salvar dados de fallback:', error);
    });
  }

  loadData(): Observable<AppData | null> {
    if (this.dataSubject.value) {
      return of(this.dataSubject.value);
    }
    
    this.loadFromStorage().then(() => {
      if (!this.dataSubject.value) {
        this.createFallbackData();
      }
    }).catch((error: Error) => {
      console.error('DataService: Erro ao carregar dados:', error);
      this.createFallbackData();
    });
    
    return this.data$;
  }

  async saveData(data: AppData): Promise<void> {
    try {
      data.lastUpdated = new Date().toISOString();
      this.dataSubject.next(data);
      await this.saveToStorage(data);
    } catch (error) {
      console.error('DataService: Erro ao salvar dados:', error);
      throw error;
    }
  }

  getCurrentData(): AppData | null {
    return this.dataSubject.value;
  }

  generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
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
      await this.saveData(data);
      return true;
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return false;
    }
  }

  async migrateFromLocalStorage(): Promise<void> {
    try {
      const localData = localStorage.getItem('fitSyncData');
      if (localData && this._storage) {
        const parsedData = JSON.parse(localData);
        await this._storage.set('fitSyncData', parsedData);
        console.log('DataService: Dados migrados do localStorage para Ionic Storage');
      }
    } catch (error) {
      console.error('DataService: Erro na migração de dados:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      if (this._storage) {
        await this._storage.clear();
      }
      localStorage.clear();
      this.dataSubject.next(null);
    } catch (error) {
      console.error('DataService: Erro ao limpar dados:', error);
    }
  }
}
