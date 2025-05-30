import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PlanoHojePage } from './plano-hoje.page';

const routes: Routes = [
  {
    path: '',
    component: PlanoHojePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PlanoHojePageRoutingModule {}
