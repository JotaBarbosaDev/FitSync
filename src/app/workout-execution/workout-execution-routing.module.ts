import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WorkoutExecutionPage } from './workout-execution.page';

const routes: Routes = [
  {
    path: '',
    component: WorkoutExecutionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkoutExecutionPageRoutingModule { }
