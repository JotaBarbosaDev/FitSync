import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Exercise, Set } from '../models';
import { DataService } from './data.service';

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  muscleGroups: string[];
  equipment: string[];
  instructions: string;
  demonstration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // duração em minutos
  calories?: number; // calorias queimadas estimadas
  imageUrl?: string; // URL da imagem ou emoji
  emoji?: string; // emoji representativo do exercício
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private exerciseLibrarySubject = new BehaviorSubject<ExerciseLibraryItem[]>([]);
  public exerciseLibrary$ = this.exerciseLibrarySubject.asObservable();

  constructor(private dataService: DataService) {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    console.log('ExerciseService: initializeService iniciado');
    // Aguardar o DataService estar pronto
    this.dataService.data$.subscribe(data => {
      console.log('ExerciseService: data$ subscription recebeu dados:', data ? 'Dados presentes' : 'Dados nulos');
      if (data) {
        console.log('ExerciseService: Chamando loadExerciseLibrary e initializeDefaultExercises');
        this.loadExerciseLibrary();
        this.initializeDefaultExercises();
      }
    });
  }
  private loadExerciseLibrary(): void {
    const data = this.dataService.getCurrentData();
    if (data && data.exerciseLibrary) {
      console.log('ExerciseService: Carregando', data.exerciseLibrary.length, 'exercícios do localStorage');
      this.exerciseLibrarySubject.next(data.exerciseLibrary);
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

      data.exerciseLibrary.push(newExercise);
      
      this.dataService.saveData(data).then(success => {
        if (success) {
          // Atualizar lista local
          const currentLibrary = this.exerciseLibrarySubject.value;
          this.exerciseLibrarySubject.next([...currentLibrary, newExercise]);
          observer.next(newExercise);
          observer.complete();
        } else {
          observer.error(new Error('Erro ao salvar exercício'));
        }
      }).catch(error => {
        observer.error(error);
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

      const exerciseIndex = data.exerciseLibrary.findIndex((e: ExerciseLibraryItem) => e.id === exerciseId);
      if (exerciseIndex === -1) {
        observer.error(new Error('Exercício não encontrado'));
        return;
      }

      data.exerciseLibrary[exerciseIndex] = {
        ...data.exerciseLibrary[exerciseIndex],
        ...updates
      };

      this.dataService.saveData(data).then(success => {
        if (success) {
          // Atualizar lista local
          const currentLibrary = this.exerciseLibrarySubject.value;
          const updatedLibrary = currentLibrary.map((e: ExerciseLibraryItem) => 
            e.id === exerciseId ? data.exerciseLibrary![exerciseIndex] : e
          );
          this.exerciseLibrarySubject.next(updatedLibrary);
          observer.next(data.exerciseLibrary[exerciseIndex]);
          observer.complete();
        } else {
          observer.error(new Error('Erro ao atualizar exercício'));
        }
      }).catch(error => {
        observer.error(error);
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

      data.exerciseLibrary = data.exerciseLibrary.filter((e: ExerciseLibraryItem) => e.id !== exerciseId);
      
      this.dataService.saveData(data).then(success => {
        if (success) {
          // Atualizar lista local
          const currentLibrary = this.exerciseLibrarySubject.value;
          this.exerciseLibrarySubject.next(currentLibrary.filter((e: ExerciseLibraryItem) => e.id !== exerciseId));
          observer.next();
          observer.complete();
        } else {
          observer.error(new Error('Erro ao deletar exercício'));
        }
      }).catch(error => {
        observer.error(error);
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
      const workout = data.workouts.find((w: any) => w.id === workoutId);
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
        order: data.exercises.filter((e: any) => e.workoutId === workoutId).length + 1
      };

      data.exercises.push(newExercise);

      // Criar as séries
      const newSets: Set[] = sets.map((setData, index) => ({
        ...setData,
        id: this.generateId('set'),
        exerciseId: newExercise.id,
        order: index + 1
      }));

      data.sets.push(...newSets);
      newExercise.sets = newSets;

      this.dataService.saveData(data).then(success => {
        if (success) {
          observer.next(newExercise);
          observer.complete();
        } else {
          observer.error(new Error('Erro ao criar exercício'));
        }
      }).catch(error => {
        observer.error(error);
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
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Função para inicializar exercícios padrão com emojis
  initializeDefaultExercises(): void {
    console.log('ExerciseService: initializeDefaultExercises iniciado');
    const data = this.dataService.getCurrentData();
    if (!data) {
      console.log('ExerciseService: Dados não carregados ainda');
      return;
    }
    
    console.log('ExerciseService: Dados encontrados, verificando exerciseLibrary:', data.exerciseLibrary);
    
    if (!data.exerciseLibrary) {
      console.log('ExerciseService: exerciseLibrary não existe, criando array vazio');
      data.exerciseLibrary = [];
    }
    
    // Se já existem exercícios, não adicionar duplicatas
    if (data.exerciseLibrary.length > 0) {
      console.log('ExerciseService: Exercícios já existem (' + data.exerciseLibrary.length + '), carregando lista atual');
      this.exerciseLibrarySubject.next(data.exerciseLibrary);
      return;
    }
    
    console.log('ExerciseService: Criando exercícios padrão');
    
    const defaultExercises: ExerciseLibraryItem[] = [
      {
        id: 'default_push_up',
        name: 'Flexão de Braço',
        category: 'chest',
        muscleGroups: ['chest', 'arms', 'shoulders'],
        equipment: [],
        instructions: 'Deite-se de bruços, apoie as mãos no chão na largura dos ombros e execute o movimento de flexão.',
        difficulty: 'beginner',
        duration: 15,
        calories: 80,
        emoji: '💪'
      },
      {
        id: 'default_squat',
        name: 'Agachamento',
        category: 'legs',
        muscleGroups: ['legs', 'glutes'],
        equipment: [],
        instructions: 'Fique em pé, pés na largura dos ombros, desça como se fosse sentar e retorne à posição inicial.',
        difficulty: 'beginner',
        duration: 15,
        calories: 100,
        emoji: '🦵'
      },
      {
        id: 'default_plank',
        name: 'Prancha',
        category: 'core',
        muscleGroups: ['core', 'shoulders'],
        equipment: [],
        instructions: 'Mantenha o corpo reto em posição de prancha, apoiado nos antebraços e pontas dos pés.',
        difficulty: 'intermediate',
        duration: 10,
        calories: 60,
        emoji: '🏋️'
      },
      {
        id: 'default_burpee',
        name: 'Burpee',
        category: 'cardio',
        muscleGroups: ['cardio', 'legs', 'chest', 'arms'],
        equipment: [],
        instructions: 'Agache, apoie as mãos no chão, salte para trás em prancha, faça flexão, volte ao agachamento e salte.',
        difficulty: 'advanced',
        duration: 20,
        calories: 150,
        emoji: '❤️'
      },
      {
        id: 'default_pull_up',
        name: 'Barra Fixa',
        category: 'back',
        muscleGroups: ['back', 'arms'],
        equipment: ['barra'],
        instructions: 'Pendure-se na barra com pegada pronada e puxe o corpo até o queixo passar da barra.',
        difficulty: 'advanced',
        duration: 15,
        calories: 120,
        emoji: '🔙'
      }
    ];
    
    data.exerciseLibrary = [...defaultExercises];
    
    this.dataService.saveData(data).then(success => {
      if (success) {
        console.log('ExerciseService: Exercícios padrão salvos com sucesso');
        this.exerciseLibrarySubject.next(data.exerciseLibrary);
      } else {
        console.error('ExerciseService: Erro ao salvar exercícios padrão');
      }
    });
  }
}
