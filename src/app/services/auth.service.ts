import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';
import { User, RegisterData, LoginData } from '../models';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private _storage: Storage | null = null;

  constructor(
    private dataService: DataService,
    private storage: Storage
  ) {
    this.init();
  }

  private async init() {
    // Inicializar o storage
    const storage = await this.storage.create();
    this._storage = storage;
    
    // Garantir que usuário demo existe
    const data = this.dataService.getCurrentData();
    if (data) {
      this.createDemoUserIfNeeded().subscribe();
    }
    
    // Carregar usuário atual após storage inicializado
    this.loadCurrentUser();
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      let savedUserId: string | null = null;
      
      if (this._storage) {
        savedUserId = await this._storage.get('fitsync_current_user');
      } else {
        // Fallback para localStorage
        savedUserId = localStorage.getItem('fitsync_current_user');
      }
      
      if (savedUserId) {
        const data = this.dataService.getCurrentData();
        if (data) {
          const user = data.users.find(u => u.id === savedUserId);
          if (user) {
            this.currentUserSubject.next(user);
          }
        }
      }
    } catch (error) {
      console.error('AuthService: Erro ao carregar usuário atual:', error);
    }
  }

  private async saveCurrentUserId(userId: string): Promise<void> {
    try {
      if (this._storage) {
        await this._storage.set('fitsync_current_user', userId);
        console.log('AuthService: ID do usuário salvo no Ionic Storage');
      } else {
        // Fallback para localStorage
        localStorage.setItem('fitsync_current_user', userId);
        console.log('AuthService: ID do usuário salvo no localStorage');
      }
    } catch (error) {
      console.error('AuthService: Erro ao salvar ID do usuário:', error);
      // Fallback para localStorage em caso de erro
      localStorage.setItem('fitsync_current_user', userId);
    }
  }

  private async removeCurrentUserId(): Promise<void> {
    try {
      if (this._storage) {
        await this._storage.remove('fitsync_current_user');
        console.log('AuthService: ID do usuário removido do Ionic Storage');
      } else {
        // Fallback para localStorage
        localStorage.removeItem('fitsync_current_user');
        console.log('AuthService: ID do usuário removido do localStorage');
      }
    } catch (error) {
      console.error('AuthService: Erro ao remover ID do usuário:', error);
      // Fallback para localStorage em caso de erro
      localStorage.removeItem('fitsync_current_user');
    }
  }

  login(email: string, password: string): Observable<User> {
    return new Observable<User>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }

      // Encontrar usuário por email
      const user = data.users.find(u => u.email === email);
      if (!user) {
        observer.error(new Error('Email ou password incorretos'));
        return;
      }

      // Validar password (em produção usar hash/bcrypt)
      if (user.password !== password) {
        observer.error(new Error('Email ou password incorretos'));
        return;
      }

      // Guardar sessão de forma assíncrona
      this.saveCurrentUserId(user.id);
      this.currentUserSubject.next(user);
      
      observer.next(user);
      observer.complete();
    });
  }

  register(userData: RegisterData): Observable<User> {
    return new Observable<User>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }

      // Verificar se email já existe
      const existingUser = data.users.find(u => u.email === userData.email);
      if (existingUser) {
        observer.error(new Error('Email já está registado'));
        return;
      }

      // Criar novo utilizador
      const newUser: User = {
        id: this.dataService.generateId(),
        email: userData.email,
        password: userData.password, // Armazenar password (em produção usar hash)
        name: userData.name,
        height: userData.height,
        weight: userData.weight,
        fitnessLevel: userData.fitnessLevel,
        goals: userData.goals,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Adicionar aos dados
      data.users.push(newUser);
      this.dataService.saveData(data);

      // Fazer login automático usando Ionic Storage
      this.saveCurrentUserId(newUser.id);
      this.currentUserSubject.next(newUser);

      observer.next(newUser);
      observer.complete();
    });
  }

  logout(): Promise<void> {
    return new Promise(async (resolve) => {
      await this.removeCurrentUserId();
      this.currentUserSubject.next(null);
      resolve();
    });
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  updateUserProfile(userData: Partial<User>): Observable<User> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      throw new Error('Utilizador não autenticado');
    }

    return new Observable<User>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }

      const userIndex = data.users.findIndex(u => u.id === currentUser.id);
      if (userIndex === -1) {
        observer.error(new Error('Utilizador não encontrado'));
        return;
      }

      // Atualizar dados do utilizador
      const updatedUser = { 
        ...data.users[userIndex], 
        ...userData, 
        updatedAt: new Date() 
      };
      
      data.users[userIndex] = updatedUser;
      this.dataService.saveData(data);
      
      this.currentUserSubject.next(updatedUser);
      observer.next(updatedUser);
      observer.complete();
    });
  }

  // Método para demo - criar utilizador demo se não existir
  createDemoUserIfNeeded(): Observable<boolean> {
    return of(this.dataService.getCurrentData()).pipe(
      map(data => {
        if (!data) return false;
        
        const demoUser = data.users.find(u => u.email === 'demo@fitsync.app');
        if (!demoUser) {
          const newDemoUser: User = {
            id: 'user1',
            email: 'demo@fitsync.app',
            password: 'demo123', // Password para usuário demo
            name: 'Utilizador Demo',
            height: 175,
            weight: 70,
            fitnessLevel: 'intermediate',
            goals: ['gain_muscle', 'lose_weight'],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          data.users.push(newDemoUser);
          this.dataService.saveData(data);
          return true;
        }
        return false;
      })
    );
  }
}
