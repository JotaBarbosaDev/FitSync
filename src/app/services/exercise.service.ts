import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, take } from 'rxjs';
import { Exercise, Set } from '../models';
import { DataService } from './data.service';

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  muscleGroups: string[];
  equipment: string[];
  instructions: string;
  description?: string; // descrição do que fazer no exercício
  demonstration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // duração em minutos
  calories?: number; // calorias queimadas estimadas
  imageUrl?: string; // URL da imagem ou emoji
  emoji?: string; // emoji representativo do exercício
  selected?: boolean; // propriedade para seleção em modais
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private exerciseLibrarySubject = new BehaviorSubject<ExerciseLibraryItem[]>([]);
  public exerciseLibrary$ = this.exerciseLibrarySubject.asObservable();
  private initialized = false;

  constructor(private dataService: DataService) {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    if (this.initialized) return;

    console.log('ExerciseService: initializeService iniciado');
    // Aguardar o DataService estar pronto - usar take(1) para evitar loop infinito
    this.dataService.data$.pipe(
      filter(data => data !== null),
      take(1)
    ).subscribe(data => {
      console.log('ExerciseService: data$ subscription recebeu dados:', data ? 'Dados presentes' : 'Dados nulos');
      if (data && !this.initialized) {
        console.log('ExerciseService: Chamando loadExerciseLibrary');
        this.loadExerciseLibrary();
        this.initialized = true;
        console.log('ExerciseService: Biblioteca inicializada vazia - apenas exercícios personalizados');
      }
    });
  }
  private loadExerciseLibrary(): void {
    const data = this.dataService.getCurrentData();
    if (data && data.exerciseLibrary) {
      console.log('ExerciseService: Carregando', data.exerciseLibrary.length, 'exercícios do localStorage');
      
      // Remover duplicatas baseadas no ID antes de emitir
      const uniqueExercises = data.exerciseLibrary.filter((exercise: Record<string, unknown>, index: number, self: Record<string, unknown>[]) => 
        index === self.findIndex((ex: Record<string, unknown>) => ex['id'] === exercise['id'])
      );
      
      if (uniqueExercises.length !== data.exerciseLibrary.length) {
        console.log('ExerciseService: Removidas', data.exerciseLibrary.length - uniqueExercises.length, 'duplicatas');
        // Atualizar dados para remover duplicatas
        data.exerciseLibrary = uniqueExercises;
        this.dataService.saveData(data);
      }
      
      this.exerciseLibrarySubject.next(uniqueExercises as unknown as ExerciseLibraryItem[]);
    } else {
      console.log('ExerciseService: Nenhum exercício encontrado no localStorage');
      this.exerciseLibrarySubject.next([]);
    }
  }

  getExerciseLibrary(): Observable<ExerciseLibraryItem[]> {
    return this.exerciseLibrary$;
  }

  getExercisesByCategory(category: string): ExerciseLibraryItem[] {
    return this.exerciseLibrarySubject.value.filter(exercise => exercise.category === category);
  }

  getExercisesByMuscleGroup(muscleGroup: string): ExerciseLibraryItem[] {
    return this.exerciseLibrarySubject.value.filter(exercise =>
      exercise.muscleGroups.includes(muscleGroup)
    );
  }

  getExercisesByEquipment(equipment: string): ExerciseLibraryItem[] {
    return this.exerciseLibrarySubject.value.filter(exercise =>
      exercise.equipment.includes(equipment)
    );
  }

  searchExercises(query: string): ExerciseLibraryItem[] {
    const searchTerm = query.toLowerCase();
    return this.exerciseLibrarySubject.value.filter(exercise =>
      exercise.name.toLowerCase().includes(searchTerm) ||
      exercise.muscleGroups.some(muscle => muscle.toLowerCase().includes(searchTerm)) ||
      exercise.category.toLowerCase().includes(searchTerm)
    );
  }

  getExerciseById(exerciseId: string): ExerciseLibraryItem | undefined {
    return this.exerciseLibrarySubject.value.find(exercise => exercise.id === exerciseId);
  }
  addCustomExercise(exerciseData: Omit<ExerciseLibraryItem, 'id'>): Observable<ExerciseLibraryItem> {
    return new Observable<ExerciseLibraryItem>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }

      if (!data.exerciseLibrary) {
        data.exerciseLibrary = [];
      }

      const newExercise: ExerciseLibraryItem = {
        ...exerciseData,
        id: this.generateId()
      };

      // Verificar se o exercício já existe para evitar duplicatas
      const existingExercise = data.exerciseLibrary.find((ex: Record<string, unknown>) => ex['id'] === newExercise.id);
      if (existingExercise) {
        observer.error(new Error('Exercício já existe'));
        return;
      }

      (data.exerciseLibrary as unknown as ExerciseLibraryItem[]).push(newExercise);

      this.dataService.saveData(data).then(() => {
        // Atualizar lista local apenas se o exercício não existe
        const currentLibrary = this.exerciseLibrarySubject.value;
        const exerciseExists = currentLibrary.find(ex => ex.id === newExercise.id);
        
        if (!exerciseExists) {
          this.exerciseLibrarySubject.next([...currentLibrary, newExercise]);
        }
        
        observer.next(newExercise);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao salvar exercício'));
      });
    });
  }
  updateCustomExercise(exerciseId: string, updates: Partial<ExerciseLibraryItem>): Observable<ExerciseLibraryItem> {
    return new Observable<ExerciseLibraryItem>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }

      if (!data.exerciseLibrary) {
        observer.error(new Error('Biblioteca de exercícios não encontrada'));
        return;
      }

      const exerciseIndex = data.exerciseLibrary.findIndex((e: Record<string, unknown>) => e['id'] === exerciseId);
      if (exerciseIndex === -1) {
        observer.error(new Error('Exercício não encontrado'));
        return;
      }

      data.exerciseLibrary[exerciseIndex] = {
        ...data.exerciseLibrary[exerciseIndex],
        ...updates
      } as Record<string, unknown>;

      this.dataService.saveData(data).then(() => {
        // Atualizar lista local
        const currentLibrary = this.exerciseLibrarySubject.value;
        const updatedLibrary = currentLibrary.map((e: ExerciseLibraryItem) =>
          e.id === exerciseId ? data.exerciseLibrary![exerciseIndex] as unknown as ExerciseLibraryItem : e
        );
        this.exerciseLibrarySubject.next(updatedLibrary);
        observer.next(data.exerciseLibrary[exerciseIndex] as unknown as ExerciseLibraryItem);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao atualizar exercício'));
      });
    });
  }
  deleteCustomExercise(exerciseId: string): Observable<void> {
    return new Observable<void>(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }

      if (!data.exerciseLibrary) {
        observer.error(new Error('Biblioteca de exercícios não encontrada'));
        return;
      }

      data.exerciseLibrary = data.exerciseLibrary.filter((e: Record<string, unknown>) => e['id'] !== exerciseId);

      this.dataService.saveData(data).then(() => {
        // Atualizar lista local
        const currentLibrary = this.exerciseLibrarySubject.value;
        this.exerciseLibrarySubject.next(currentLibrary.filter((e: ExerciseLibraryItem) => e.id !== exerciseId));
        observer.next();
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao deletar exercício'));
      });
    });
  }

  getAvailableCategories(): string[] {
    return ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'];
  }

  getAvailableEquipment(): string[] {
    const allEquipment = this.exerciseLibrarySubject.value
      .flatMap(exercise => exercise.equipment)
      .filter((value, index, self) => self.indexOf(value) === index);

    return allEquipment.sort();
  }

  getAvailableMuscleGroups(): string[] {
    const allMuscleGroups = this.exerciseLibrarySubject.value
      .flatMap(exercise => exercise.muscleGroups)
      .filter((value, index, self) => self.indexOf(value) === index);

    return allMuscleGroups.sort();
  }
  createExerciseFromLibrary(
    workoutId: string,
    libraryExerciseId: string,
    sets: Omit<Set, 'id' | 'exerciseId'>[]
  ): Observable<Exercise> {
    return new Observable<Exercise>(observer => {
      const libraryExercise = this.getExerciseById(libraryExerciseId);
      if (!libraryExercise) {
        observer.error(new Error('Exercício não encontrado na biblioteca'));
        return;
      }

      const data = this.dataService.getCurrentData();
      if (!data) {
        observer.error(new Error('Dados não carregados'));
        return;
      }

      // Verificar se o workout existe
      const workout = data.workouts.find((w: Record<string, unknown>) => w['id'] === workoutId);
      if (!workout) {
        observer.error(new Error('Workout não encontrado'));
        return;
      }

      // Criar o exercício
      const newExercise: Exercise = {
        id: this.generateId('exercise'),
        workoutId,
        name: libraryExercise.name,
        category: libraryExercise.category,
        sets: [],
        instructions: libraryExercise.instructions,
        demonstration: libraryExercise.demonstration,
        equipment: libraryExercise.equipment,
        muscleGroups: libraryExercise.muscleGroups,
        order: data.exercises.filter((e: Record<string, unknown>) => e['workoutId'] === workoutId).length + 1
      };

      data.exercises.push(newExercise as unknown as Record<string, unknown>);

      // Criar as séries
      const newSets: Set[] = sets.map((setData, index) => ({
        ...setData,
        id: this.generateId('set'),
        exerciseId: newExercise.id,
        order: index + 1
      }));

      data.sets.push(...(newSets as unknown as Record<string, unknown>[]));
      newExercise.sets = newSets;

      this.dataService.saveData(data).then(() => {
        observer.next(newExercise);
        observer.complete();
      }).catch(() => {
        observer.error(new Error('Erro ao criar exercício'));
      });
    });
  }

  getRecommendedExercises(targetMuscleGroups: string[], difficulty: string = 'intermediate'): ExerciseLibraryItem[] {
    return this.exerciseLibrarySubject.value
      .filter(exercise =>
        exercise.difficulty === difficulty &&
        targetMuscleGroups.some(muscle => exercise.muscleGroups.includes(muscle))
      )
      .slice(0, 10); // Limitar a 10 recomendações
  }

  private generateId(prefix: string = 'exercise'): string {
    let id: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      id = prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      attempts++;
      
      // Verificar se o ID já existe
      const currentExercises = this.exerciseLibrarySubject.value;
      const exists = currentExercises.some(exercise => exercise.id === id);
      
      if (!exists || attempts >= maxAttempts) {
        break;
      }
      
      // Aguardar 1ms antes de tentar novamente para garantir timestamp diferente
      const now = Date.now();
      while (Date.now() === now) {
        // busy wait por 1ms
      }
    } while (attempts < maxAttempts);
    
    console.log(`ExerciseService: ID gerado: ${id} (tentativas: ${attempts})`);
    return id;
  }

  // Função para limpar todos os exercícios da biblioteca
  clearAllExercises(): Observable<boolean> {
    return new Observable(observer => {
      const data = this.dataService.getCurrentData();
      if (!data) {
        console.error('ExerciseService: Dados não disponíveis');
        observer.next(false);
        observer.complete();
        return;
      }

      console.log('ExerciseService: Limpando todos os exercícios da biblioteca');
      data.exerciseLibrary = [];

      this.dataService.saveData(data).then(() => {
        console.log('ExerciseService: Todos os exercícios foram removidos com sucesso');
        this.exerciseLibrarySubject.next([]);
        observer.next(true);
        observer.complete();
      }).catch(error => {
        console.error('ExerciseService: Erro ao limpar exercícios:', error);
        observer.next(false);
        observer.complete();
      });
    });
  }

  // Método para recarregar a biblioteca de exercícios
  reloadExerciseLibrary(): void {
    console.log('ExerciseService: Recarregando biblioteca de exercícios');
    this.loadExerciseLibrary();
  }

  // Método para verificar e remover duplicatas
  removeDuplicates(): Observable<boolean> {
    return new Observable(observer => {
      const data = this.dataService.getCurrentData();
      if (!data || !data.exerciseLibrary) {
        observer.next(false);
        observer.complete();
        return;
      }

      const originalCount = data.exerciseLibrary.length;
      const uniqueExercises = data.exerciseLibrary.filter((exercise: Record<string, unknown>, index: number, self: Record<string, unknown>[]) => 
        index === self.findIndex((ex: Record<string, unknown>) => ex['id'] === exercise['id'])
      );

      if (uniqueExercises.length !== originalCount) {
        console.log(`ExerciseService: Removendo ${originalCount - uniqueExercises.length} duplicatas`);
        data.exerciseLibrary = uniqueExercises;
        
        this.dataService.saveData(data).then(() => {
          this.exerciseLibrarySubject.next(uniqueExercises as unknown as ExerciseLibraryItem[]);
          observer.next(true);
          observer.complete();
        }).catch(error => {
          console.error('ExerciseService: Erro ao remover duplicatas:', error);
          observer.next(false);
          observer.complete();
        });
      } else {
        observer.next(false);
        observer.complete();
      }
    });
  }
}
