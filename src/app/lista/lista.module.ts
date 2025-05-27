import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { ListaPage } from './lista.page';

const routes = [
  {
    path: '',
    component: ListaPage
  }
];

@NgModule({
  imports: [
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [ListaPage]
})
export class ListaPageModule {}
