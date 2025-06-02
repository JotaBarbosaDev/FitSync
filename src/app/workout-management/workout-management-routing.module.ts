import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WorkoutManagementPage } from './workout-management.page';

const routes: Routes = [
  {
    path: '',
    component: WorkoutManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkoutManagementPageRoutingModule {}
