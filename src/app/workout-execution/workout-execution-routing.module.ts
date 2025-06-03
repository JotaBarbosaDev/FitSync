import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WorkoutExecutionPage } from './workout-execution.page';
import { BicepWorkoutComponent } from './bicep-workout.component';

const routes: Routes = [
  {
    path: '',
    component: WorkoutExecutionPage
  },
  {
    path: 'bicep',
    component: BicepWorkoutComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkoutExecutionPageRoutingModule {}
