import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: "app-detalhe",
  templateUrl: "./detalhe.page.html",
  styleUrls: ["./detalhe.page.scss"],
  standalone: false,
})
export class DetalhePage implements OnInit {
  public valorRecebido: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.valorRecebido = this.route.snapshot.paramMap.get("id");
  }
}
