import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TimelineMapService } from '../timeline-map.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.less']
})
export class LayoutComponent implements OnInit {

  @Input() hideHeader = false;
  @Input() api: TimelineMapService;
  @Output() info = new EventEmitter<boolean>();
  @Output() addNew = new EventEmitter<boolean>();
  @Output() layers = new EventEmitter<boolean>();


  constructor() { }

  ngOnInit(): void {
  }

}
