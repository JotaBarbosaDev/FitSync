import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { AuthService } from './auth.service';
import { WorkoutManagementService } from './workout-management.service';
import { AppData, User } from '../models';
import { CustomWorkout, WeeklyPlan, DayPlan, WorkoutExercise } from '../models/workout-system.model';
import { Observable, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DemoDataService {

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private workoutManagementService: WorkoutManagementService
  ) { }

  /**
   * Inicializa dados de demonstração para testar a aplicação
   */
  initializeDemoData(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.authService.getCurrentUser().pipe(take(1)).subscribe({
        next: async (user) => {
          if (!user) {
            // Criar usuário demo se não existir
            await this.createDemoUser();
            // Tentar novamente com o usuário criado
            this.authService.getCurrentUser().pipe(take(1)).subscribe({
              next: async (newUser) => {
                if (newUser) {
                  await this.createDemoWorkoutsAndPlans(newUser);
                  observer.next(true);
                  observer.complete();
                } else {
                  observer.next(false);
                  observer.complete();
                }
              }
            });
          } else {
            // Verificar se já existem dados
            const hasData = await this.checkExistingData(user);
            if (!hasData) {
              await this.createDemoWorkoutsAndPlans(user);
            }
            observer.next(true);
            observer.complete();
          }
        },
        error: (error) => {
          console.error('Erro ao inicializar dados demo:', error);
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  private async createDemoUser(): Promise<void> {
    const data = this.dataService.getCurrentData();
    if (!data) return;

    const demoUser: User = {
      id: 'demo-user-1',
      email: 'demo@fitsync.app',
      name: 'Usuário Demo',
      password: 'demo123',
      fitnessLevel: 'intermediate',
      goals: ['muscle_gain', 'strength'],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Verificar se usuário já existe
    const existingUser = data.users.find(u => u.email === demoUser.email);
    if (!existingUser) {
      data.users.push(demoUser);
      await this.dataService.saveData(data);
    }
  }

  private async checkExistingData(user: User): Promise<boolean> {
    const data = this.dataService.getCurrentData();
    if (!data) return false;

    // Verificar se existem treinos personalizados e plano semanal ativo
    const hasCustomWorkouts = (data.customWorkouts || []).some(w => w.createdBy === user.id);
    const hasActivePlan = (data.weeklyPlans || []).some(p => p.userId === user.id && p.isActive);

    return hasCustomWorkouts && hasActivePlan;
  }

  private async createDemoWorkoutsAndPlans(user: User): Promise<void> {
    console.log('Criando dados demo para usuário:', user.name);

    try {
      // 1. Criar treinos personalizados
      const workouts = await this.createDemoCustomWorkouts(user);
      console.log('Treinos criados:', workouts.length);

      // 2. Criar plano semanal
      const weeklyPlan = await this.createDemoWeeklyPlan(user, workouts);
      console.log('Plano semanal criado:', weeklyPlan.name);

      console.log('Dados demo criados com sucesso!');
    } catch (error) {
      console.error('Erro ao criar dados demo:', error);
    }
  }

  private async createDemoCustomWorkouts(user: User): Promise<CustomWorkout[]> {
    const workouts: Omit<CustomWorkout, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
      {
        name: 'Peito e Tríceps',
        description: 'Treino focado no desenvolvimento do peito e tríceps',
        category: 'strength',
        estimatedDuration: 60,
        difficulty: 'medium',
        muscleGroups: ['chest', 'triceps'],
        equipment: ['barbell', 'parallel_bars'],
        isTemplate: false,
        exercises: [
          {
            id: 'ex-1',
            exerciseId: 'ex-1',
            order: 1,
            restTime: 120,
            sets: [
              {
                id: 'set-1-1',
                reps: 8,
                weight: 80,
                completed: false
              },
              {
                id: 'set-1-2',
                reps: 8,
                weight: 80,
                completed: false
              },
              {
                id: 'set-1-3',
                reps: 8,
                weight: 80,
                completed: false
              },
              {
                id: 'set-1-4',
                reps: 8,
                weight: 80,
                completed: false
              }
            ]
          },
          {
            id: 'ex-2',
            exerciseId: 'ex-2',
            order: 2,
            restTime: 90,
            sets: [
              {
                id: 'set-2-1',
                reps: 10,
                weight: 70,
                completed: false
              },
              {
                id: 'set-2-2',
                reps: 10,
                weight: 70,
                completed: false
              },
              {
                id: 'set-2-3',
                reps: 10,
                weight: 70,
                completed: false
              }
            ]
          },
          {
            id: 'ex-3',
            exerciseId: 'ex-3',
            order: 3,
            restTime: 60,
            sets: [
              {
                id: 'set-3-1',
                reps: 12,
                weight: 30,
                completed: false
              },
              {
                id: 'set-3-2',
                reps: 12,
                weight: 30,
                completed: false
              },
              {
                id: 'set-3-3',
                reps: 12,
                weight: 30,
                completed: false
              }
            ]
          },
          {
            id: 'ex-4',
            exerciseId: 'ex-4',
            order: 4,
            restTime: 90,
            sets: [
              {
                id: 'set-4-1',
                reps: 10,
                completed: false
              },
              {
                id: 'set-4-2',
                reps: 10,
                completed: false
              },
              {
                id: 'set-4-3',
                reps: 10,
                completed: false
              }
            ]
          }
        ]
      },
      {
        name: 'Costas e Bíceps',
        description: 'Treino completo para desenvolvimento das costas e bíceps',
        category: 'strength',
        estimatedDuration: 65,
        difficulty: 'medium',
        muscleGroups: ['back', 'biceps'],
        equipment: ['cable_machine', 'barbell', 'dumbbells'],
        isTemplate: false,
        exercises: [
          {
            id: 'ex-5',
            exerciseId: 'ex-5',
            order: 1,
            restTime: 120,
            sets: [
              {
                id: 'set-5-1',
                reps: 8,
                weight: 70,
                completed: false
              },
              {
                id: 'set-5-2',
                reps: 8,
                weight: 70,
                completed: false
              },
              {
                id: 'set-5-3',
                reps: 8,
                weight: 70,
                completed: false
              },
              {
                id: 'set-5-4',
                reps: 8,
                weight: 70,
                completed: false
              }
            ]
          },
          {
            id: 'ex-6',
            exerciseId: 'ex-6',
            order: 2,
            restTime: 120,
            sets: [
              {
                id: 'set-6-1',
                reps: 8,
                weight: 60,
                completed: false
              },
              {
                id: 'set-6-2',
                reps: 8,
                weight: 60,
                completed: false
              },
              {
                id: 'set-6-3',
                reps: 8,
                weight: 60,
                completed: false
              },
              {
                id: 'set-6-4',
                reps: 8,
                weight: 60,
                completed: false
              }
            ]
          },
          {
            id: 'ex-7',
            exerciseId: 'ex-7',
            order: 3,
            restTime: 60,
            sets: [
              {
                id: 'set-7-1',
                reps: 10,
                weight: 25,
                completed: false
              },
              {
                id: 'set-7-2',
                reps: 10,
                weight: 25,
                completed: false
              },
              {
                id: 'set-7-3',
                reps: 10,
                weight: 25,
                completed: false
              }
            ]
          },
          {
            id: 'ex-8',
            exerciseId: 'ex-8',
            order: 4,
            restTime: 60,
            sets: [
              {
                id: 'set-8-1',
                reps: 12,
                weight: 15,
                completed: false
              },
              {
                id: 'set-8-2',
                reps: 12,
                weight: 15,
                completed: false
              },
              {
                id: 'set-8-3',
                reps: 12,
                weight: 15,
                completed: false
              }
            ]
          }
        ]
      },
      {
        name: 'Pernas Completo',
        description: 'Treino intenso para quadríceps, posteriores e glúteos',
        category: 'strength',
        estimatedDuration: 70,
        difficulty: 'medium',
        muscleGroups: ['legs', 'glutes'],
        equipment: ['barbell', 'leg_press_machine', 'calf_machine'],
        isTemplate: false,
        exercises: [
          {
            id: 'ex-9',
            exerciseId: 'ex-9',
            order: 1,
            restTime: 150,
            sets: [
              {
                id: 'set-9-1',
                reps: 8,
                weight: 100,
                completed: false
              },
              {
                id: 'set-9-2',
                reps: 8,
                weight: 100,
                completed: false
              },
              {
                id: 'set-9-3',
                reps: 8,
                weight: 100,
                completed: false
              },
              {
                id: 'set-9-4',
                reps: 8,
                weight: 100,
                completed: false
              }
            ]
          },
          {
            id: 'ex-10',
            exerciseId: 'ex-10',
            order: 2,
            restTime: 120,
            sets: [
              {
                id: 'set-10-1',
                reps: 12,
                weight: 150,
                completed: false
              },
              {
                id: 'set-10-2',
                reps: 12,
                weight: 150,
                completed: false
              },
              {
                id: 'set-10-3',
                reps: 12,
                weight: 150,
                completed: false
              }
            ]
          },
          {
            id: 'ex-11',
            exerciseId: 'ex-11',
            order: 3,
            restTime: 90,
            sets: [
              {
                id: 'set-11-1',
                reps: 10,
                weight: 60,
                completed: false
              },
              {
                id: 'set-11-2',
                reps: 10,
                weight: 60,
                completed: false
              },
              {
                id: 'set-11-3',
                reps: 10,
                weight: 60,
                completed: false
              }
            ]
          },
          {
            id: 'ex-12',
            exerciseId: 'ex-12',
            order: 4,
            restTime: 60,
            sets: [
              {
                id: 'set-12-1',
                reps: 15,
                weight: 40,
                completed: false
              },
              {
                id: 'set-12-2',
                reps: 15,
                weight: 40,
                completed: false
              },
              {
                id: 'set-12-3',
                reps: 15,
                weight: 40,
                completed: false
              },
              {
                id: 'set-12-4',
                reps: 15,
                weight: 40,
                completed: false
              }
            ]
          }
        ]
      },
      {
        name: 'Ombros e Abdômen',
        description: 'Treino para ombros e fortalecimento do core',
        category: 'strength',
        estimatedDuration: 50,
        difficulty: 'medium',
        muscleGroups: ['shoulders', 'abs'],
        equipment: ['barbell', 'dumbbells', 'bodyweight'],
        isTemplate: false,
        exercises: [
          {
            id: 'ex-13',
            exerciseId: 'ex-13',
            order: 1,
            restTime: 120,
            sets: [
              {
                id: 'set-13-1',
                reps: 8,
                weight: 50,
                completed: false
              },
              {
                id: 'set-13-2',
                reps: 8,
                weight: 50,
                completed: false
              },
              {
                id: 'set-13-3',
                reps: 8,
                weight: 50,
                completed: false
              },
              {
                id: 'set-13-4',
                reps: 8,
                weight: 50,
                completed: false
              }
            ]
          },
          {
            id: 'ex-14',
            exerciseId: 'ex-14',
            order: 2,
            restTime: 60,
            sets: [
              {
                id: 'set-14-1',
                reps: 12,
                weight: 12,
                completed: false
              },
              {
                id: 'set-14-2',
                reps: 12,
                weight: 12,
                completed: false
              },
              {
                id: 'set-14-3',
                reps: 12,
                weight: 12,
                completed: false
              }
            ]
          },
          {
            id: 'ex-15',
            exerciseId: 'ex-15',
            order: 3,
            restTime: 60,
            sets: [
              {
                id: 'set-15-1',
                reps: 12,
                weight: 10,
                completed: false
              },
              {
                id: 'set-15-2',
                reps: 12,
                weight: 10,
                completed: false
              },
              {
                id: 'set-15-3',
                reps: 12,
                weight: 10,
                completed: false
              }
            ]
          },
          {
            id: 'ex-16',
            exerciseId: 'ex-16',
            order: 4,
            restTime: 60,
            sets: [
              {
                id: 'set-16-1',
                duration: 30,
                completed: false
              },
              {
                id: 'set-16-2',
                duration: 30,
                completed: false
              },
              {
                id: 'set-16-3',
                duration: 30,
                completed: false
              }
            ]
          }
        ]
      }
    ];

    const createdWorkouts: CustomWorkout[] = [];

    for (const workoutData of workouts) {
      const result = await new Promise<CustomWorkout>((resolve, reject) => {
        this.workoutManagementService.createCustomWorkout(workoutData).subscribe({
          next: (workout) => resolve(workout),
          error: (error) => reject(error)
        });
      });
      createdWorkouts.push(result);
    }

    return createdWorkouts;
  }

  private async createDemoWeeklyPlan(user: User, workouts: CustomWorkout[]): Promise<WeeklyPlan> {
    const planData: Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
      name: 'Plano de Hipertrofia - 4x/semana',
      isActive: true,
      days: {
        monday: {
          type: 'workout',
          workoutId: workouts[0].id, // Peito e Tríceps
          date: this.getTodayDateString(),
          isRestDay: false,
          completed: false
        },
        tuesday: {
          type: 'workout',
          workoutId: workouts[1].id, // Costas e Bíceps
          date: this.getTodayDateString(),
          isRestDay: false,
          completed: false
        },
        wednesday: {
          type: 'rest',
          date: this.getTodayDateString(),
          isRestDay: true,
          completed: false
        },
        thursday: {
          type: 'workout',
          workoutId: workouts[2].id, // Pernas Completo
          date: this.getTodayDateString(),
          isRestDay: false,
          completed: false
        },
        friday: {
          type: 'workout',
          workoutId: workouts[3].id, // Ombros e Abdômen
          date: this.getTodayDateString(),
          isRestDay: false,
          completed: false
        },
        saturday: {
          type: 'rest',
          date: this.getTodayDateString(),
          isRestDay: true,
          completed: false
        },
        sunday: {
          type: 'rest',
          date: this.getTodayDateString(),
          isRestDay: true,
          completed: false
        }
      }
    };

    return new Promise<WeeklyPlan>((resolve, reject) => {
      this.workoutManagementService.createWeeklyPlan(planData).subscribe({
        next: (plan) => resolve(plan),
        error: (error) => reject(error)
      });
    });
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Limpa todos os dados demo
   */
  async clearDemoData(): Promise<void> {
    const data = this.dataService.getCurrentData();
    if (!data) return;

    // Limpar dados do sistema novo
    data.customWorkouts = [];
    data.weeklyPlans = [];
    data.workoutSessions2 = [];
    data.workoutProgress = [];
    data.dayPlans = [];

    await this.dataService.saveData(data);
    console.log('Dados demo limpos com sucesso!');
  }

  /**
   * Verifica se existem dados demo
   */
  hasDemoData(): boolean {
    const data = this.dataService.getCurrentData();
    if (!data) return false;

    return (data.customWorkouts || []).length > 0 || (data.weeklyPlans || []).length > 0;
  }
}
