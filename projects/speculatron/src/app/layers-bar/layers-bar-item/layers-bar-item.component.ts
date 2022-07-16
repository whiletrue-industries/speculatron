import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-layers-bar-item',
  templateUrl: './layers-bar-item.component.html',
  styleUrls: ['./layers-bar-item.component.less']
})
export class LayersBarItemComponent implements OnInit {

  @Input() author: any;
  @Output() changed = new EventEmitter<void>();
  
  constructor() { }

  ngOnInit(): void {
  }

  toggle() {
    this.author.selected = !this.author.selected;
    this.changed.emit();
  }
}
