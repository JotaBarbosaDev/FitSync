import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@NgModule({
  imports: [
    FormsModule,
    IonicModule
  ],
  exports: [
    FormsModule,
    IonicModule
  ]
})
export class SharedModule { }
