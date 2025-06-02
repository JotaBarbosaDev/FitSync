import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WorkoutExecutionPageRoutingModule } from './workout-execution-routing.module';

import { WorkoutExecutionPage } from './workout-execution.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WorkoutExecutionPageRoutingModule,
    WorkoutExecutionPage
  ]
})
export class WorkoutExecutionPageModule { }
