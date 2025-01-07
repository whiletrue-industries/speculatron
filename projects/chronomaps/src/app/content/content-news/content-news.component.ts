import { Component, Input, OnInit } from '@angular/core';
import { ChronomapDatabase, TimelineItem } from '../../data.service';

@Component({
    selector: 'app-content-news',
    templateUrl: './content-news.component.html',
    styleUrls: ['./content-news.component.less'],
    standalone: false
})
export class ContentNewsComponent implements OnInit {

  @Input() item: TimelineItem;

  @Input() chronomap: ChronomapDatabase;

  constructor() { }

  ngOnInit(): void {
  }

}
