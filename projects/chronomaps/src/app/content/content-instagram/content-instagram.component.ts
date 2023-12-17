import { Component, Input, OnInit } from '@angular/core';
import { ChronomapDatabase, TimelineItem } from '../../data.service';

@Component({
  selector: 'app-content-instagram',
  templateUrl: './content-instagram.component.html',
  styleUrls: ['./content-instagram.component.less']
})
export class ContentInstagramComponent implements OnInit {

  @Input() item: TimelineItem;

  @Input() chronomap: ChronomapDatabase;

  constructor() { }

  ngOnInit(): void {
  }

}
