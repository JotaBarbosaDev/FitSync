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
    
    console.log('AuthService: Storage inicializado');
    
    // Garantir que usuário demo existe - aguardar dados carregarem
    setTimeout(() => {
      const data = this.dataService.getCurrentData();
      if (data) {
        console.log('AuthService: Dados carregados, verificando conta demo');
        this.createDemoUserIfNeeded().subscribe(created => {
          if (created) {
            console.log('AuthService: Conta demo criada com sucesso');
          } else {
            console.log('AuthService: Conta demo já existia');
          }
        });
      } else {
        console.log('AuthService: Dados ainda não carregados, aguardando...');
        // Tentar novamente após mais tempo
        setTimeout(() => {
          const retryData = this.dataService.getCurrentData();
          if (retryData) {
            this.createDemoUserIfNeeded().subscribe();
          }
        }, 2000);
      }
    }, 1000);
    
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

      console.log('AuthService: Tentativa de login para:', email);
      console.log('AuthService: Total de usuários no sistema:', data.users.length);

      // Normalizar email para comparação (remover espaços e converter para minúsculas)
      const normalizedEmail = email.toLowerCase().trim();
      
      // Encontrar usuário por email (normalizado)
      const user = data.users.find(u => u.email.toLowerCase().trim() === normalizedEmail);
      
      if (!user) {
        console.log('AuthService: Usuário não encontrado para email:', normalizedEmail);
        console.log('AuthService: Emails disponíveis:', data.users.map(u => u.email));
        observer.error(new Error('Email ou senha incorretos'));
        return;
      }

      console.log('AuthService: Usuário encontrado:', user.email);

      // Validar password (em produção usar hash/bcrypt)
      if (user.password !== password) {
        console.log('AuthService: Senha incorreta para usuário:', user.email);
        observer.error(new Error('Email ou senha incorretos'));
        return;
      }

      console.log('AuthService: Login bem-sucedido para:', user.email);

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

      console.log('AuthService: Tentativa de registro para:', userData.email);

      // Normalizar email para comparação
      const normalizedEmail = userData.email.toLowerCase().trim();

      // Verificar se email já existe (normalizado)
      const existingUser = data.users.find(u => u.email.toLowerCase().trim() === normalizedEmail);
      if (existingUser) {
        console.log('AuthService: Email já registrado:', normalizedEmail);
        observer.error(new Error('Email já está registado'));
        return;
      }

      // Criar novo utilizador
      const newUser: User = {
        id: this.dataService.generateId(),
        email: normalizedEmail, // Usar email normalizado
        password: userData.password, // Armazenar password (em produção usar hash)
        name: userData.name,
        height: userData.height,
        weight: userData.weight,
        fitnessLevel: userData.fitnessLevel,
        goals: userData.goals,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('AuthService: Novo usuário criado:', newUser.email);

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
          console.log('AuthService: Conta demo criada');
          return true;
        }
        console.log('AuthService: Conta demo já existe');
        return false;
      })
    );
  }

  // Métodos de debug para desenvolvimento
  async debugStorage() {
    const data = this.dataService.getCurrentData();
    let currentUserId: string | null = null;
    
    if (this._storage) {
      currentUserId = await this._storage.get('fitsync_current_user');
    } else {
      currentUserId = localStorage.getItem('fitsync_current_user');
    }

    const debugInfo = {
      totalUsers: data?.users?.length || 0,
      users: data?.users?.map(u => ({ id: u.id, email: u.email, name: u.name })) || [],
      currentUserId,
      currentUser: this.currentUserSubject.value,
      storageInitialized: !!this._storage
    };

    console.log('=== DEBUG AUTH SERVICE ===');
    console.log('Total de usuários:', debugInfo.totalUsers);
    console.log('Usuários registrados:', debugInfo.users);
    console.log('ID do usuário atual no storage:', debugInfo.currentUserId);
    console.log('Usuário atual no subject:', debugInfo.currentUser);
    console.log('Storage inicializado:', debugInfo.storageInitialized);
    console.log('=========================');

    return debugInfo;
  }

  async getAllUsers() {
    const data = this.dataService.getCurrentData();
    return data?.users || [];
  }

  // Método público para forçar criação da conta demo
  async ensureDemoAccount(): Promise<boolean> {
    return new Promise((resolve) => {
      this.createDemoUserIfNeeded().subscribe(created => {
        resolve(created);
      });
    });
  }

  // Método para mostrar TODOS os dados armazenados no console
  async debugAllStoredData(): Promise<void> {
    console.group('🔍 DEBUG - TODOS OS DADOS ARMAZENADOS');
    
    try {
      // 1. Dados do DataService (usuários, exercícios, etc.)
      const appData = this.dataService.getCurrentData();
      console.log('📊 Dados principais da aplicação:');
      console.log(appData);
      
      // 2. Dados do Ionic Storage
      if (this._storage) {
        console.log('💾 Dados do Ionic Storage:');
        const keys = await this._storage.keys();
        for (const key of keys) {
          const value = await this._storage.get(key);
          console.log(`   ${key}:`, value);
        }
      }
      
      // 3. Dados do localStorage
      console.log('💿 Dados do localStorage:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const value = localStorage.getItem(key);
            // Tentar parsear JSON para melhor visualização
            const parsedValue = value ? JSON.parse(value) : value;
            console.log(`   ${key}:`, parsedValue);
          } catch {
            // Se não for JSON, mostrar como string
            console.log(`   ${key}:`, localStorage.getItem(key));
          }
        }
      }
      
      // 4. SessionStorage
      console.log('🗂️ Dados do sessionStorage:');
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          try {
            const value = sessionStorage.getItem(key);
            const parsedValue = value ? JSON.parse(value) : value;
            console.log(`   ${key}:`, parsedValue);
          } catch {
            console.log(`   ${key}:`, sessionStorage.getItem(key));
          }
        }
      }
      
      // 5. Estado atual da autenticação
      console.log('👤 Estado da autenticação:');
      const authDebug = await this.debugStorage();
      console.log(authDebug);
      
    } catch (error) {
      console.error('❌ Erro ao obter dados armazenados:', error);
    }
    
    console.groupEnd();
  }

  // Método para limpar todos os dados exceto credenciais demo
  async clearAllDataExceptDemo(): Promise<boolean> {
    try {
      console.log('🧹 Iniciando limpeza de dados (preservando demo)...');
      
      // Salvar dados da conta demo
      const currentData = this.dataService.getCurrentData();
      const demoUser = currentData?.users?.find(u => u.email === 'demo@fitsync.app');
      
      if (!demoUser) {
        console.warn('⚠️ Conta demo não encontrada!');
        return false;
      }
      
      // Fazer logout do usuário atual
      await this.logout();
      
      // Limpar Ionic Storage
      if (this._storage) {
        const keys = await this._storage.keys();
        for (const key of keys) {
          if (key !== 'fitsync_current_user' && !key.includes('demo')) {
            await this._storage.remove(key);
          }
        }
        console.log('✅ Ionic Storage limpo (exceto demo)');
      }
      
      // Limpar localStorage (preservando dados específicos)
      const keysToPreserve = ['fitsync_current_user'];
      const localStorageKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) localStorageKeys.push(key);
      }
      
      for (const key of localStorageKeys) {
        if (!keysToPreserve.some(preserve => key.includes(preserve)) && 
            !key.includes('demo') && 
            !key.includes('theme')) {
          localStorage.removeItem(key);
        }
      }
      
      // Limpar sessionStorage
      sessionStorage.clear();
      
      // Recriar dados com apenas usuário demo
      const newAppData = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        users: [demoUser],
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
      
      // Salvar dados limpos
      await this.dataService.saveData(newAppData);
      
      console.log('✅ Limpeza concluída! Apenas conta demo preservada.');
      return true;
      
    } catch (error) {
      console.error('❌ Erro durante limpeza:', error);
      return false;
    }
  }
}
