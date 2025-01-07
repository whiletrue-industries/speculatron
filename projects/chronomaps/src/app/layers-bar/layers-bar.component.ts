import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ChronomapDatabase } from '../data.service';

@Component({
    selector: 'app-layers-bar',
    templateUrl: './layers-bar.component.html',
    styleUrls: ['./layers-bar.component.less'],
    standalone: false
})
export class LayersBarComponent implements OnInit {
  
  @Input() chronomap: ChronomapDatabase;

  @Output() close = new EventEmitter();
  @Output() addNew = new EventEmitter();
  
  constructor() { }

  ngOnInit(): void {
  }

  closeMe() {
    this.close.emit();
  }
}


