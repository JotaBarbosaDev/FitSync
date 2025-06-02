import { Component, OnInit } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { ExerciseLibraryItem } from '../services/exercise.service';

@Component({
    selector: 'app-exercise-selection-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, SlicePipe],
    template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ dayName }} - Selecionar Exercícios</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="closeModal()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="modal-content">
        <!-- Search Bar -->
        <ion-searchbar 
          [(ngModel)]="searchTerm" 
          (ionInput)="filterExercises()"
          placeholder="Pesquisar exercícios...">
        </ion-searchbar>

        <!-- Category Filter -->
        <ion-segment [(ngModel)]="selectedCategory" (ionChange)="filterExercises()">
          <ion-segment-button value="">
            <ion-label>Todos</ion-label>
          </ion-segment-button>
          <ion-segment-button value="chest">
            <ion-label>Peito</ion-label>
          </ion-segment-button>
          <ion-segment-button value="back">
            <ion-label>Costas</ion-label>
          </ion-segment-button>
          <ion-segment-button value="legs">
            <ion-label>Pernas</ion-label>
          </ion-segment-button>
          <ion-segment-button value="arms">
            <ion-label>Braços</ion-label>
          </ion-segment-button>
          <ion-segment-button value="core">
            <ion-label>Core</ion-label>
          </ion-segment-button>
          <ion-segment-button value="cardio">
            <ion-label>Cardio</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Exercise List -->
        <ion-list>
          <ion-item *ngFor="let exercise of filteredExercises; trackBy: trackByExercise">
            <ion-checkbox 
              [checked]="exercise.selected"
              (ionChange)="onCheckboxChange(exercise, $event)"
              slot="start">
            </ion-checkbox>
            <ion-label (click)="toggleExercise(exercise)">
              <h3>{{ exercise.name }}</h3>
              <p>{{ getCategoryName(exercise.category) }}</p>
              <p class="exercise-description">{{ exercise.instructions | slice:0:100 }}...</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Empty State -->
        <div *ngIf="filteredExercises.length === 0" class="empty-state">
          <ion-icon name="fitness-outline"></ion-icon>
          <h3>Nenhum exercício encontrado</h3>
          <p>Tente ajustar os filtros de busca</p>
        </div>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <div class="footer-content">
          <span>{{ getSelectedCount() }} exercícios selecionados</span>
          <ion-button 
            (click)="saveSelection()" 
            [disabled]="getSelectedCount() === 0"
            fill="solid" 
            color="primary">
            Adicionar {{ getSelectedCount() }} exercício(s)
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
    styles: [`
    .modal-content {
      padding: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--ion-color-medium);
    }

    .empty-state ion-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .exercise-description {
      color: var(--ion-color-medium);
      font-size: 0.9em;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      width: 100%;
    }

    ion-segment {
      margin-bottom: 16px;
    }
  `]
})
export class ExerciseSelectionModalComponent implements OnInit {
    availableExercises: ExerciseLibraryItem[] = [];
    selectedExercises: ExerciseLibraryItem[] = [];
    filteredExercises: ExerciseLibraryItem[] = [];
    dayName: string = '';
    searchTerm: string = '';
    selectedCategory: string = '';

    constructor(private modalController: ModalController) { }

    ngOnInit() {
        console.log('Modal ngOnInit - availableExercises:', this.availableExercises.length);
        console.log('Modal ngOnInit - selectedExercises:', this.selectedExercises.length);

        // Ensure we have clean copies and properly mark selected exercises
        this.initializeSelection();
        this.filterExercises();
    }

    private initializeSelection() {
        // Create a Set of selected exercise IDs for fast lookup
        const selectedIds = new Set(this.selectedExercises.map(ex => ex.id));

        // Mark exercises as selected if they are in the selectedExercises array
        this.availableExercises.forEach(exercise => {
            exercise.selected = selectedIds.has(exercise.id);
        });

        console.log('Initialization complete - selected count:', this.getSelectedCount());
    }

    filterExercises() {
        this.filteredExercises = this.availableExercises.filter(exercise => {
            const matchesSearch = !this.searchTerm ||
                exercise.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                exercise.instructions.toLowerCase().includes(this.searchTerm.toLowerCase());

            const matchesCategory = !this.selectedCategory || exercise.category === this.selectedCategory;

            return matchesSearch && matchesCategory;
        });

        console.log('Filter applied - showing', this.filteredExercises.length, 'of', this.availableExercises.length, 'exercises');
    }

    onCheckboxChange(exercise: ExerciseLibraryItem, event: any) {
        console.log('Checkbox change for:', exercise.name, 'checked:', event.detail.checked);
        exercise.selected = event.detail.checked;
        console.log('Updated state:', exercise.selected, 'Total selected:', this.getSelectedCount());
    }

    toggleExercise(exercise: ExerciseLibraryItem) {
        console.log('Toggling exercise:', exercise.name, 'current state:', exercise.selected);
        exercise.selected = !exercise.selected;
        console.log('New state:', exercise.selected, 'Total selected:', this.getSelectedCount());
    }

    trackByExercise(index: number, exercise: ExerciseLibraryItem): string {
        return exercise.id;
    }

    getSelectedCount(): number {
        return this.availableExercises.filter(ex => ex.selected).length;
    }

    getCategoryName(category: string): string {
        const categoryNames: { [key: string]: string } = {
            'chest': 'Peito',
            'back': 'Costas',
            'legs': 'Pernas',
            'shoulders': 'Ombros',
            'arms': 'Braços',
            'core': 'Core',
            'cardio': 'Cardio'
        };
        return categoryNames[category] || category;
    }

    async saveSelection() {
        console.log('Saving selection...');

        // Get only the selected exercises and create clean copies
        const selectedExercises = this.availableExercises
            .filter(ex => {
                const isSelected = ex.selected === true;
                if (isSelected) {
                    console.log('Selected exercise:', ex.name);
                }
                return isSelected;
            })
            .map(exercise => {
                // Create a clean copy without the selected property
                const { selected, ...cleanExercise } = exercise;
                return cleanExercise as ExerciseLibraryItem;
            });

        console.log('Total exercises being saved:', selectedExercises.length);

        await this.modalController.dismiss({
            exercises: selectedExercises,
            action: 'save'
        });
    }

    async closeModal() {
        await this.modalController.dismiss();
    }
}
