import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnalisarProgressoPage } from './analisar-progresso.page';

const routes: Routes = [
  {
    path: '',
    component: AnalisarProgressoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalisarProgressoPageRoutingModule {}
