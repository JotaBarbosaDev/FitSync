import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { TestPage } from './test.page';

const routes = [
  {
    path: '',
    component: TestPage
  }
];

@NgModule({
  imports: [
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [TestPage]
})
export class TestPageModule {}
