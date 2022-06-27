import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.less']
})
export class LayoutComponent implements OnInit {

  @Input() hideHeader = false;
  @Output() info = new EventEmitter<boolean>();
  @Output() addNew = new EventEmitter<boolean>();


  constructor() { }

  ngOnInit(): void {
  }

}
