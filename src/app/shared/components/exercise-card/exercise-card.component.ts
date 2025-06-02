import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ExerciseData } from '../../../services/json-data.service';
import { TranslationService } from '../../../services/translation.service';

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
  @Input() isCustomExercise: boolean = false; // Nova propriedade para identificar exercícios personalizados

  @Output() exerciseClick = new EventEmitter<ExerciseData>();
  @Output() favoriteToggle = new EventEmitter<{ exercise: ExerciseData, event: Event }>();
  @Output() editExercise = new EventEmitter<ExerciseData>(); // Novo evento para editar
  @Output() deleteExercise = new EventEmitter<ExerciseData>(); // Novo evento para excluir

  constructor(private translationService: TranslationService) {}

  onExerciseClick() {
    this.exerciseClick.emit(this.exercise);
  }

  onFavoriteClick(event: Event) {
    event.stopPropagation();
    this.favoriteToggle.emit({ exercise: this.exercise, event });
  }

  onEditClick(event: Event) {
    event.stopPropagation();
    this.editExercise.emit(this.exercise);
  }

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteExercise.emit(this.exercise);
  }

  getMuscleGroupName(groupId: string): string {
    return this.translationService.getMuscleGroupLabel(groupId);
  }

  getDifficultyColor(difficulty: string): string {
    return this.translationService.getDifficultyColor(difficulty);
  }

  getDifficultyIcon(difficulty: string): string {
    return this.translationService.getDifficultyIcon(difficulty);
  }

  getDifficultyEmoji(difficulty: string): string {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
      case 'iniciante':
        return '🟢';
      case 'intermediate':
      case 'intermediário':
        return '🟡';
      case 'advanced':
      case 'avançado':
        return '🔴';
      default:
        return '⚪';
    }
  }

  getDifficultyLabel(difficulty: string): string {
    return this.translationService.getDifficultyLabel(difficulty);
  }
}
