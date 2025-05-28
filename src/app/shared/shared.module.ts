import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ProgressChartComponent } from './progress-chart/progress-chart.component';

@NgModule({
  declarations: [
    ProgressChartComponent
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
    ProgressChartComponent
  ]
})
export class SharedModule { }
