import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

// Interfaces para tipos de dados do storage
interface WorkoutData {
  id: string;
  name: string;
  exercises: unknown[];
  duration?: number;
  createdAt: Date;
  [key: string]: unknown;
}

interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  age?: number;
  weight?: number;
  height?: number;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string[];
  [key: string]: unknown;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: Date;
  [key: string]: unknown;
}

interface AppSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  units: 'metric' | 'imperial';
  language: string;
  [key: string]: unknown;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
  instructions: string;
  difficulty: string;
  [key: string]: unknown;
}

interface ProgressData {
  [key: string]: unknown;
}

/**
 * Serviço de armazenamento local usando Ionic Storage
 * Responsável por gerenciar persistência de dados na aplicação FitSync
 * Utiliza SQLite no dispositivo móvel e IndexedDB no navegador
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  /** Instância do Ionic Storage para operações de armazenamento */
  private _storage: Storage | null = null;

  constructor(private storage: Storage) {
    // Inicializa o storage automaticamente na criação do serviço
    this.init();
  }

  /**
   * Inicializa o sistema de armazenamento Ionic Storage
   * Deve ser chamado antes de qualquer operação de storage
   * Cria as tabelas necessárias no SQLite/IndexedDB
   */
  async init() {
    // Cria instância do storage com configurações padrão
    const storage = await this.storage.create();
    this._storage = storage;
    console.log('💾 Ionic Storage inicializado com sucesso');
  }

  /**
   * Salva um valor no storage com uma chave específica
   * @param key Chave única para identificar o dado
   * @param value Valor a ser armazenado (pode ser qualquer tipo)
   * @returns Promise que resolve quando dados são salvos
   */
  public async set(key: string, value: unknown): Promise<unknown> {
    // Valida se storage foi inicializado antes de usar
    if (!this._storage) {
      console.warn('⚠️ Storage não inicializado, tentando inicializar...');
      await this.init();
    }
    
    try {
      const result = await this._storage?.set(key, value);
      console.log(`💾 Dados salvos: ${key}`);
      return result;
    } catch (error) {
      console.error(`❌ Erro ao salvar ${key}:`, error);
      throw error;
    }
  }

  /**
   * Recupera um valor do storage pela chave
   * @param key Chave do dado a ser recuperado
   * @returns Promise com o valor armazenado ou null se não existir
   */
  public async get<T = unknown>(key: string): Promise<T> {
    // Valida se storage foi inicializado
    if (!this._storage) {
      await this.init();
    }

    try {
      const value = await this._storage?.get(key);
      if (value !== null && value !== undefined) {
        console.log(`📖 Dados carregados: ${key}`);
      }
      return value;
    } catch (error) {
      console.error(`❌ Erro ao carregar ${key}:`, error);
      return null as T;
    }
  }

  /**
   * Remove um item específico do storage
   * @param key Chave do item a ser removido
   * @returns Promise que resolve quando item é removido
   */
  public async remove(key: string): Promise<unknown> {
    if (!this._storage) {
      await this.init();
    }

    try {
      const result = await this._storage?.remove(key);
      console.log(`🗑️ Item removido: ${key}`);
      return result;
    } catch (error) {
      console.error(`❌ Erro ao remover ${key}:`, error);
      throw error;
    }
  }

  /**
   * Limpa todos os dados do storage
   * ⚠️ CUIDADO: Esta operação remove TODOS os dados da aplicação
   * @returns Promise que resolve quando storage é limpo
   */
  public async clear(): Promise<void> {
    if (!this._storage) {
      await this.init();
    }

    try {
      await this._storage?.clear();
      console.log('🧹 Storage limpo completamente');
    } catch (error) {
      console.error('❌ Erro ao limpar storage:', error);
      throw error;
    }
  }

  /**
   * Obtém todas as chaves armazenadas
   * Útil para debug e manutenção da aplicação
   * @returns Promise com array de todas as chaves
   */
  public async keys(): Promise<string[]> {
    if (!this._storage) {
      await this.init();
    }

    try {
      const keys = await this._storage?.keys() || [];
      console.log(`🔑 Total de chaves no storage: ${keys.length}`);
      return keys;
    } catch (error) {
      console.error('❌ Erro ao obter chaves:', error);
      return [];
    }
  }

  public async length(): Promise<number> {
    return this._storage?.length() || 0;
  }

  // Workout specific methods
  async saveWorkout(workout: WorkoutData): Promise<void> {
    const workouts = await this.getWorkouts();
    workouts.push(workout);
    await this.set('workouts', workouts);
  }

  async getWorkouts(): Promise<WorkoutData[]> {
    const result = await this.get('workouts');
    return Array.isArray(result) ? result as WorkoutData[] : [];
  }

  async getWorkoutById(id: string): Promise<WorkoutData | null> {
    const workouts = await this.getWorkouts();
    return workouts.find(w => w.id === id) || null;
  }

  async deleteWorkout(id: string): Promise<void> {
    const workouts = await this.getWorkouts();
    const filtered = workouts.filter(w => w.id !== id);
    await this.set('workouts', filtered);
  }

  // User Profile methods
  async saveUserProfile(profile: UserProfile): Promise<void> {
    await this.set('userProfile', profile);
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const result = await this.get('userProfile');
    return result as UserProfile | null;
  }

  // Achievements methods
  async saveAchievements(achievements: Achievement[]): Promise<void> {
    await this.set('achievements', achievements);
  }

  async getAchievements(): Promise<Achievement[]> {
    const result = await this.get('achievements');
    return Array.isArray(result) ? result as Achievement[] : [];
  }

  async unlockAchievement(achievementId: string): Promise<void> {
    const achievements = await this.getAchievements();
    const achievement = achievements.find(a => a.id === achievementId);
    if (achievement) {
      achievement.unlocked = true;
      achievement.unlockedDate = new Date();
      await this.saveAchievements(achievements);
    }
  }

  // Settings methods
  async saveSettings(settings: AppSettings): Promise<void> {
    await this.set('appSettings', settings);
  }

  async getSettings(): Promise<AppSettings> {
    const result = await this.get('appSettings');
    return result ? result as AppSettings : {
      theme: 'dark',
      notifications: true,
      units: 'metric',
      language: 'pt'
    };
  }

  // Exercise data methods
  async saveExerciseData(exercises: Exercise[]): Promise<void> {
    await this.set('exerciseLibrary', exercises);
  }

  async getExerciseData(): Promise<Exercise[]> {
    const result = await this.get('exerciseLibrary');
    return Array.isArray(result) ? result as Exercise[] : [];
  }

  // Progress tracking
  async saveProgressData(progressData: ProgressData): Promise<void> {
    await this.set('progressData', progressData);
  }

  async getProgressData(): Promise<ProgressData> {
    const result = await this.get('progressData');
    return result ? result as ProgressData : {};
  }
}
