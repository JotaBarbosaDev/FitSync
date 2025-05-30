import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PersonalizarTreinoPage } from './personalizar-treino.page';

const routes: Routes = [
  {
    path: '',
    component: PersonalizarTreinoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PersonalizarTreinoPageRoutingModule {}
