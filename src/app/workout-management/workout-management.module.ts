import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WorkoutManagementPageRoutingModule } from './workout-management-routing.module';

import { WorkoutManagementPage } from './workout-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WorkoutManagementPageRoutingModule
  ],
  declarations: [WorkoutManagementPage]
})
export class WorkoutManagementPageModule {}
