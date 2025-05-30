import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PersonalizarTreinoPageRoutingModule } from './personalizar-treino-routing.module';

import { PersonalizarTreinoPage } from './personalizar-treino.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PersonalizarTreinoPageRoutingModule
  ],
  declarations: [PersonalizarTreinoPage],
  providers: [DecimalPipe, DatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class PersonalizarTreinoPageModule {}
