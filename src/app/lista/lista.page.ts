import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  difficulty: string;
  duration: number;
  calories: number;
  equipment?: string;
  image: string;
  isFavorite: boolean;
  description: string;
  instructions: string[];
}

interface MuscleGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-lista',
  templateUrl: './lista.page.html',
  styleUrls: ['./lista.page.scss'],
  standalone: false
})
export class ListaPage implements OnInit {
  searchQuery: string = '';
  selectedMuscleGroup: string = 'all';
  showFavoritesOnly: boolean = false;
  
  exercises: Exercise[] = [
    {
      id: '1',
      name: 'Supino Reto',
      muscleGroup: 'chest',
      difficulty: 'Intermediário',
      duration: 45,
      calories: 120,
      equipment: 'Barra',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      isFavorite: false,
      description: 'Exercício fundamental para desenvolvimento do peitoral',
      instructions: [
        'Deite-se no banco com os pés apoiados no chão',
        'Segure a barra com pegada um pouco mais larga que os ombros',
        'Desça a barra controladamente até o peito',
        'Empurre a barra de volta à posição inicial'
      ]
    },
    {
      id: '2',
      name: 'Agachamento',
      muscleGroup: 'legs',
      difficulty: 'Iniciante',
      duration: 30,
      calories: 100,
      equipment: 'Peso Corporal',
      image: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      isFavorite: true,
      description: 'Exercício completo para membros inferiores',
      instructions: [
        'Fique em pé com os pés afastados na largura dos ombros',
        'Desça como se fosse sentar em uma cadeira',
        'Mantenha o peito erguido e os joelhos alinhados',
        'Retorne à posição inicial'
      ]
    },
    {
      id: '3',
      name: 'Barra Fixa',
      muscleGroup: 'back',
      difficulty: 'Avançado',
      duration: 20,
      calories: 80,
      equipment: 'Barra Fixa',
      image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      isFavorite: false,
      description: 'Exercício para fortalecimento das costas e bíceps',
      instructions: [
        'Pendure-se na barra com pegada pronada',
        'Puxe o corpo para cima até o queixo passar da barra',
        'Desça controladamente até a extensão completa',
        'Repita o movimento'
      ]
    },
    {
      id: '4',
      name: 'Desenvolvimento de Ombros',
      muscleGroup: 'shoulders',
      difficulty: 'Intermediário',
      duration: 35,
      calories: 90,
      equipment: 'Halteres',
      image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      isFavorite: false,
      description: 'Exercício para desenvolvimento dos deltoides',
      instructions: [
        'Segure os halteres na altura dos ombros',
        'Empurre os pesos para cima até a extensão completa',
        'Desça controladamente até a posição inicial',
        'Mantenha o core contraído'
      ]
    },
    {
      id: '5',
      name: 'Rosca Direta',
      muscleGroup: 'arms',
      difficulty: 'Iniciante',
      duration: 25,
      calories: 60,
      equipment: 'Halteres',
      image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      isFavorite: true,
      description: 'Exercício isolado para bíceps',
      instructions: [
        'Fique em pé com os halteres nas mãos',
        'Flexione os cotovelos levantando os pesos',
        'Contraia o bíceps no topo do movimento',
        'Desça controladamente'
      ]
    },
    {
      id: '6',
      name: 'Prancha',
      muscleGroup: 'core',
      difficulty: 'Iniciante',
      duration: 60,
      calories: 40,
      equipment: 'Peso Corporal',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      isFavorite: false,
      description: 'Exercício isométrico para fortalecimento do core',
      instructions: [
        'Apoie-se nos antebraços e dedos dos pés',
        'Mantenha o corpo alinhado em linha reta',
        'Contraia o abdômen e glúteos',
        'Mantenha a posição pelo tempo determinado'
      ]
    }
  ];

  muscleGroups: MuscleGroup[] = [
    { id: 'all', name: 'Todos', icon: 'fitness-outline', color: 'primary' },
    { id: 'chest', name: 'Peito', icon: 'body-outline', color: 'danger' },
    { id: 'back', name: 'Costas', icon: 'person-outline', color: 'success' },
    { id: 'legs', name: 'Pernas', icon: 'walk-outline', color: 'warning' },
    { id: 'shoulders', name: 'Ombros', icon: 'arrow-up-outline', color: 'tertiary' },
    { id: 'arms', name: 'Braços', icon: 'barbell-outline', color: 'secondary' },
    { id: 'core', name: 'Abdômen', icon: 'diamond-outline', color: 'medium' }
  ];

  filteredExercises: Exercise[] = [];

  constructor(
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.filteredExercises = [...this.exercises];
  }

  filterExercises() {
    this.filteredExercises = this.exercises.filter(exercise => {
      const matchesSearch = exercise.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                           exercise.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesMuscleGroup = this.selectedMuscleGroup === 'all' || 
                                exercise.muscleGroup === this.selectedMuscleGroup;
      
      const matchesFavorites = !this.showFavoritesOnly || exercise.isFavorite;
      
      return matchesSearch && matchesMuscleGroup && matchesFavorites;
    });
  }

  filterByMuscleGroup(groupId: string) {
    this.selectedMuscleGroup = groupId;
    this.filterExercises();
  }

  toggleFavorites() {
    this.showFavoritesOnly = !this.showFavoritesOnly;
    this.filterExercises();
  }

  async toggleFavorite(exercise: Exercise, event: Event) {
    event.stopPropagation();
    exercise.isFavorite = !exercise.isFavorite;
    
    const toast = await this.toastController.create({
      message: exercise.isFavorite ? 
        `${exercise.name} adicionado aos favoritos` : 
        `${exercise.name} removido dos favoritos`,
      duration: 2000,
      position: 'bottom',
      color: exercise.isFavorite ? 'success' : 'medium'
    });
    toast.present();
  }

  getMuscleGroupName(groupId: string): string {
    const group = this.muscleGroups.find(g => g.id === groupId);
    return group ? group.name : groupId;
  }

  openExerciseDetail(exercise: Exercise) {
    this.router.navigate(['/detalhe'], { 
      queryParams: { exerciseId: exercise.id } 
    });
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedMuscleGroup = 'all';
    this.showFavoritesOnly = false;
    this.filterExercises();
  }

  createCustomExercise() {
    // Implementar criação de exercício personalizado
    this.router.navigate(['/create-exercise']);
  }

  trackByExerciseId(index: number, exercise: Exercise): string {
    return exercise.id;
  }
}
