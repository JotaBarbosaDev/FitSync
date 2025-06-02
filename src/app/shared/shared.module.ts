import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ProgressChartComponent } from './progress-chart/progress-chart.component';
import { TimerComponent } from '../components/timer/timer.component';
import { ExerciseCardComponent } from './components/exercise-card/exercise-card.component';

@NgModule({
  declarations: [
    ProgressChartComponent,
    TimerComponent,
    ExerciseCardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProgressChartComponent,
    TimerComponent,
    ExerciseCardComponent
  ]
})
export class SharedModule { }
