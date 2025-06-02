import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WorkoutProgressPage } from './workout-progress.page';

const routes: Routes = [
  {
    path: '',
    component: WorkoutProgressPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkoutProgressPageRoutingModule {}
