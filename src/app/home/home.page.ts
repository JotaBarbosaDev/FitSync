import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  nomeInstituto: string;

  constructor(private router: Router) {
    this.nomeInstituto = 'Instituto Politecnico d Viana do Castelo';
  }
    public verDetalhe() {
    this.router.navigateByUrl('/detalhe/123');
  }

}


