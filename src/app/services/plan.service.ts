import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { Plan, Day, Workout, Exercise, User, AppData } from '../models';
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
    this.authService.getCurrentUser().subscribe(currentUser => {
      if (!currentUser) return;

      this.dataService.data$.subscribe(data => {
        if (data) {
          const userPlans = data.plans.filter(plan => plan.userId === currentUser.id);
          this.plansSubject.next(userPlans);
        }
      });
    });
  }

  getPlans(): Observable<Plan[]> {
    return this.plans$;
  }
  createPlan(planData: Omit<Plan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Observable<Plan> {
    return this.authService.getCurrentUser().pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          throw new Error('Usuário não autenticado');
        }

        const newPlan: Plan = {
          ...planData,
          id: this.generateId(),
          userId: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return this.dataService.data$.pipe(
          take(1),
          switchMap(data => {
            if (!data) {
              throw new Error('Dados não encontrados');
            }
            
            data.plans.push(newPlan);
            
            return new Observable<Plan>(observer => {
              this.dataService.saveData(data).then(() => {
                // Atualizar lista local
                const currentPlans = this.plansSubject.value;
                this.plansSubject.next([...currentPlans, newPlan]);
                observer.next(newPlan);
                observer.complete();
              }).catch(error => {
                observer.error(new Error('Erro ao salvar plano'));
              });
            });
          })
        );
      })
    );
  }
  updatePlan(planId: string, updates: Partial<Plan>): Observable<Plan> {
    return new Observable<Plan>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }
      
      const planIndex = data.plans.findIndex((p: Plan) => p.id === planId);
      
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
          p.id === planId ? data.plans[planIndex] : p
        );
        this.plansSubject.next(updatedPlans);
        observer.next(data.plans[planIndex]);
        observer.complete();
      }).catch(error => {
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
      const removedDayIds = data.days.filter((d: Day) => d.planId === planId).map((d: Day) => d.id);
      
      // Obter IDs dos workouts que serão removidos
      const removedWorkoutIds = data.workouts.filter((w: Workout) => removedDayIds.includes(w.dayId)).map((w: Workout) => w.id);
      
      // Remover o plano
      data.plans = data.plans.filter((p: Plan) => p.id !== planId);
      
      // Remover dias associados
      data.days = data.days.filter((d: Day) => d.planId !== planId);
      
      // Remover workouts associados aos dias removidos
      data.workouts = data.workouts.filter((w: Workout) => !removedDayIds.includes(w.dayId));
      
      // Remover exercises associados aos workouts removidos
      data.exercises = data.exercises.filter((e: Exercise) => !removedWorkoutIds.includes(e.workoutId));

      this.dataService.saveData(data).then(() => {
        // Atualizar lista local
        const currentPlans = this.plansSubject.value;
        this.plansSubject.next(currentPlans.filter((p: Plan) => p.id !== planId));
        observer.next();
        observer.complete();
      }).catch(error => {
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
      
      const plan = data.plans.find((p: Plan) => p.id === planId);
      if (!plan) {
        observer.error(new Error('Plano não encontrado'));
        return;
      }

      const days = data.days.filter((d: Day) => d.planId === planId);
      const dayIds = days.map((d: Day) => d.id);
      const workouts = data.workouts.filter((w: Workout) => dayIds.includes(w.dayId));
      const workoutIds = workouts.map((w: Workout) => w.id);
      const exercises = data.exercises.filter((e: Exercise) => workoutIds.includes(e.workoutId));

      observer.next({ plan, days, workouts, exercises });
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
          data.plans.forEach((plan: Plan) => {
            if (plan.userId === currentUser.id) {
              plan.isActive = plan.id === planId;
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
          }).catch(error => {
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
