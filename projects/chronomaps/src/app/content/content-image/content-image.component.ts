import { Component, Input, OnInit } from '@angular/core';
import { ChronomapDatabase, TimelineItem } from '../../data.service';

@Component({
    selector: 'app-content-image',
    templateUrl: './content-image.component.html',
    styleUrls: ['./content-image.component.less'],
    standalone: false
})
export class ContentImageComponent implements OnInit {

  @Input() item: TimelineItem;

  @Input() chronomap: ChronomapDatabase;

  constructor() { }

  ngOnInit(): void {
  }

}
