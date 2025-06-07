import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-refreshable-content',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-content 
      [fullscreen]="fullscreen"
      [scrollEvents]="true"
      (ionRefresh)="onRefresh($event)">
      <ng-content></ng-content>
    </ion-content>
  `
})
export class RefreshableContentComponent {
  @Input() fullscreen: boolean = true;
  @Input() refreshing: boolean = false;
  @Output() refresh = new EventEmitter<void>();

  async onRefresh(event: any) {
    console.log('🔄 Pull-to-refresh acionado');
    
    // Emitir evento para o componente pai
    this.refresh.emit();
    
    // Aguardar um tempo mínimo para UX
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }
}
