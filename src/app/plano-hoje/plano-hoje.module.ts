import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PlanoHojePageRoutingModule } from './plano-hoje-routing.module';

import { PlanoHojePage } from './plano-hoje.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PlanoHojePageRoutingModule
  ],
  declarations: [PlanoHojePage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  providers: [DecimalPipe, DatePipe]
})
export class PlanoHojePageModule {}
