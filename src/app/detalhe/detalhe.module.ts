import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { DetalhePage } from './detalhe.page';

const routes = [
  {
    path: '',
    component: DetalhePage
  }
];

@NgModule({
  imports: [
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [DetalhePage]
})
export class DetalhePageModule {}
  