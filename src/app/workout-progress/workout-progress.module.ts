import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WorkoutProgressPageRoutingModule } from './workout-progress-routing.module';

import { WorkoutProgressPage } from './workout-progress.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WorkoutProgressPageRoutingModule
  ],
  declarations: [WorkoutProgressPage]
})
export class WorkoutProgressPageModule {}
