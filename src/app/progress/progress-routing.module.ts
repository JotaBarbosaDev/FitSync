import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProgressPage } from './progress.page';

const routes: Routes = [
  {
    path: '',
    component: ProgressPage
  },
  {
    path: 'achievements',
    loadChildren: () => import('./achievements/achievements.module').then( m => m.AchievementsPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProgressPageRoutingModule {}
