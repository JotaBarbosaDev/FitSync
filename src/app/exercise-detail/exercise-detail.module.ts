import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ExerciseDetailPageRoutingModule } from './exercise-detail-routing.module';
import { SharedModule } from '../shared/shared.module';

import { ExerciseDetailPage } from './exercise-detail.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    ExerciseDetailPageRoutingModule
  ],
  declarations: [ExerciseDetailPage]
})
export class ExerciseDetailPageModule {}
