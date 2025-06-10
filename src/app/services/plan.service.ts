import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { Plan, Day, Workout, Exercise } from '../models';
import { DataService } from './data.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private plansSubject = new BehaviorSubject<Plan[]>([]);
  public plans$ = this.plansSubject.asObservable();

  constructor(
    private dataService: DataService,
    private authService: AuthService
  ) {
    this.loadUserPlans();
  }
  private loadUserPlans(): void {
    this.authService.getCurrentUser().pipe(take(1)).subscribe(currentUser => {
      if (!currentUser) return;

      const data = this.dataService.getCurrentData();
      if (data) {
        const userPlans = data.plans.filter((plan: Record<string, unknown>) => plan['userId'] === currentUser.id);
        this.plansSubject.next(userPlans as unknown as Plan[]);
      }
    });
  }

  getPlans(): Observable<Plan[]> {
    return this.plans$;
  }
  createPlan(planData: Omit<Plan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Observable<Plan> {
    return new Observable<Plan>(observer => {
      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: (currentUser) => {
          if (!currentUser) {
            observer.error(new Error('Usuário não autenticado'));
            return;
          }

          const data = this.dataService.getCurrentData();
          if (!data) {
            observer.error(new Error('Dados não encontrados'));
            return;
          }

          const newPlan: Plan = {
            ...planData,
            id: this.generateId(),
            userId: currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          data.plans.push(newPlan as unknown as Record<string, unknown>);

          this.dataService.saveData(data).then(() => {
            // Atualizar lista local
            const currentPlans = this.plansSubject.value;
            this.plansSubject.next([...currentPlans, newPlan]);
            observer.next(newPlan);
            observer.complete();
          }).catch(() => {
            observer.error(new Error('Erro ao salvar plano'));
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }
  updatePlan(planId: string, updates: Partial<Plan>): Observable<Plan> {
    return new Observable<Plan>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }
      
      const planIndex = data.plans.findIndex((p: Record<string, unknown>) => p['id'] === planId);
      
      if (planIndex === -1) {
        observer.error(new Error('Plano não encontrado'));
        return;
      }

      data.plans[planIndex] = {
        ...data.plans[planIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.dataService.saveData(data).then(() => {
        // Atualizar lista local
        const currentPlans = this.plansSubject.value;
        const updatedPlans = currentPlans.map((p: Plan) => 
          p.id === planId ? data.plans[planIndex] as unknown as Plan : p
        );
        this.plansSubject.next(updatedPlans);
        observer.next(data.plans[planIndex] as unknown as Plan);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar plano'));
      });
    });
  }
  deletePlan(planId: string): Observable<void> {
    return new Observable<void>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }
      
      // Obter IDs dos dias que serão removidos antes da remoção
      const removedDayIds = data.days.filter((d: Record<string, unknown>) => d['planId'] === planId).map((d: Record<string, unknown>) => d['id'] as string);
      
      // Obter IDs dos workouts que serão removidos
      const removedWorkoutIds = data.workouts.filter((w: Record<string, unknown>) => removedDayIds.includes(w['dayId'] as string)).map((w: Record<string, unknown>) => w['id'] as string);
      
      // Remover o plano
      data.plans = data.plans.filter((p: Record<string, unknown>) => p['id'] !== planId);
      
      // Remover dias associados
      data.days = data.days.filter((d: Record<string, unknown>) => d['planId'] !== planId);
      
      // Remover workouts associados aos dias removidos
      data.workouts = data.workouts.filter((w: Record<string, unknown>) => !removedDayIds.includes(w['dayId'] as string));
      
      // Remover exercises associados aos workouts removidos
      data.exercises = data.exercises.filter((e: Record<string, unknown>) => !removedWorkoutIds.includes(e['workoutId'] as string));

      this.dataService.saveData(data).then(() => {
        // Atualizar lista local
        const currentPlans = this.plansSubject.value;
        this.plansSubject.next(currentPlans.filter((p: Plan) => p.id !== planId));
        observer.next();
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao deletar plano'));
      });
    });
  }
  getPlanDetails(planId: string): Observable<{plan: Plan, days: Day[], workouts: Workout[], exercises: Exercise[]}> {
    return new Observable(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }
      
      const plan = data.plans.find((p: Record<string, unknown>) => p['id'] === planId);
      if (!plan) {
        observer.error(new Error('Plano não encontrado'));
        return;
      }

      const days = data.days.filter((d: Record<string, unknown>) => d['planId'] === planId);
      const dayIds = days.map((d: Record<string, unknown>) => d['id'] as string);
      const workouts = data.workouts.filter((w: Record<string, unknown>) => dayIds.includes(w['dayId'] as string));
      const workoutIds = workouts.map((w: Record<string, unknown>) => w['id'] as string);
      const exercises = data.exercises.filter((e: Record<string, unknown>) => workoutIds.includes(e['workoutId'] as string));

      observer.next({ 
        plan: plan as unknown as Plan, 
        days: days as unknown as Day[], 
        workouts: workouts as unknown as Workout[], 
        exercises: exercises as unknown as Exercise[] 
      });
      observer.complete();
    });
  }  setActivePlan(planId: string): Observable<void> {
    return new Observable<void>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }

      this.authService.getCurrentUser().subscribe({
        next: (currentUser) => {
          if (!currentUser) {
            observer.error(new Error('Usuário não autenticado'));
            return;
          }

          // Desativar todos os planos do usuário
          data.plans.forEach((plan: Record<string, unknown>) => {
            if (plan['userId'] === currentUser.id) {
              plan['isActive'] = plan['id'] === planId;
            }
          });

          this.dataService.saveData(data).then(() => {
            // Atualizar lista local
            const currentPlans = this.plansSubject.value;
            const updatedPlans = currentPlans.map((p: Plan) => ({
              ...p,
              isActive: p.id === planId
            }));
            
            this.plansSubject.next(updatedPlans);
            observer.next();
            observer.complete();
          }).catch(() => {
            observer.error(new Error('Erro ao ativar plano'));
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  getActivePlan(): Plan | null {
    return this.plansSubject.value.find(plan => plan.isActive) || null;
  }

  private generateId(): string {
    return 'plan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
