import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User, RegisterData, LoginData } from '../models';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private dataService: DataService) {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    const savedUserId = localStorage.getItem('fitsync_current_user');
    if (savedUserId) {
      this.dataService.data$.subscribe(data => {
        if (data) {
          const user = data.users.find(u => u.id === savedUserId);
          if (user) {
            this.currentUserSubject.next(user);
          }
        }
      });
    }
  }

  login(email: string, password: string): Observable<User> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) {
          throw new Error('Dados não carregados');
        }

        // Simulação de validação de password (em produção usar hash)
        const user = data.users.find(u => u.email === email);
        if (!user) {
          throw new Error('Email ou password incorretos');
        }

        // Em produção, validar password hash aqui
        // Por agora, aceitar qualquer password para demo
        
        // Guardar sessão
        localStorage.setItem('fitsync_current_user', user.id);
        this.currentUserSubject.next(user);
        
        return user;
      })
    );
  }

  register(userData: RegisterData): Observable<User> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) {
          throw new Error('Dados não carregados');
        }

        // Verificar se email já existe
        const existingUser = data.users.find(u => u.email === userData.email);
        if (existingUser) {
          throw new Error('Email já está registado');
        }

        // Criar novo utilizador
        const newUser: User = {
          id: this.dataService.generateId(),
          email: userData.email,
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

        // Fazer login automático
        localStorage.setItem('fitsync_current_user', newUser.id);
        this.currentUserSubject.next(newUser);

        return newUser;
      })
    );
  }

  logout(): Promise<void> {
    return new Promise((resolve) => {
      localStorage.removeItem('fitsync_current_user');
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

    return this.dataService.data$.pipe(
      map(data => {
        if (!data) {
          throw new Error('Dados não carregados');
        }

        const userIndex = data.users.findIndex(u => u.id === currentUser.id);
        if (userIndex === -1) {
          throw new Error('Utilizador não encontrado');
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
        return updatedUser;
      })
    );
  }

  // Método para demo - criar utilizador demo se não existir
  createDemoUserIfNeeded(): Observable<boolean> {
    return this.dataService.data$.pipe(
      map(data => {
        if (!data) return false;
        
        const demoUser = data.users.find(u => u.email === 'demo@fitsync.app');
        if (!demoUser) {
          const newDemoUser: User = {
            id: 'user1',
            email: 'demo@fitsync.app',
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
