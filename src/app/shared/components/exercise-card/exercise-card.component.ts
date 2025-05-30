import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ExerciseData } from '../../../services/json-data.service';

@Component({
  selector: 'app-exercise-card',
  templateUrl: './exercise-card.component.html',
  styleUrls: ['./exercise-card.component.scss'],
  standalone: false
})
export class ExerciseCardComponent {
  @Input() exercise!: ExerciseData;
  @Input() isFavorite: boolean = false;
  @Input() showFavoriteButton: boolean = true;
  @Input() showStats: boolean = true;
  @Input() layout: 'grid' | 'list' = 'grid';

  @Output() exerciseClick = new EventEmitter<ExerciseData>();
  @Output() favoriteToggle = new EventEmitter<{ exercise: ExerciseData, event: Event }>();

  onExerciseClick() {
    this.exerciseClick.emit(this.exercise);
  }

  onFavoriteClick(event: Event) {
    event.stopPropagation();
    this.favoriteToggle.emit({ exercise: this.exercise, event });
  }

  getMuscleGroupName(groupId: string): string {
    const muscleGroups: { [key: string]: string } = {
      chest: 'Peito',
      back: 'Costas',
      shoulders: 'Ombros',
      arms: 'Braços',
      legs: 'Pernas',
      core: 'Core',
      cardio: 'Cardio',
      general: 'Geral'
    };
    return muscleGroups[groupId] || groupId;
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'iniciante':
      case 'beginner':
        return 'success';
      case 'intermediário':
      case 'intermediate':
        return 'warning';
      case 'avançado':
      case 'advanced':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getDifficultyIcon(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'iniciante':
      case 'beginner':
        return 'flower-outline';
      case 'intermediário':
      case 'intermediate':
        return 'fitness-outline';
      case 'avançado':
      case 'advanced':
        return 'flame-outline';
      default:
        return 'help-outline';
    }
  }
}
