import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ProgressChartComponent } from './progress-chart/progress-chart.component';
import { TimerComponent } from '../components/timer/timer.component';

@NgModule({
  declarations: [
    ProgressChartComponent,
    TimerComponent
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
    TimerComponent
  ]
})
export class SharedModule { }
