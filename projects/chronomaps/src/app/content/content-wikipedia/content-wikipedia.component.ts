import { Time } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { marked } from 'marked';
import { ChronomapDatabase, TimelineItem } from '../../data.service';
@Component({
  selector: 'app-content-wikipedia',
  templateUrl: './content-wikipedia.component.html',
  styleUrls: ['./content-wikipedia.component.less']
})
export class ContentWikipediaComponent implements OnInit {

  @Input() item: TimelineItem;
  @Input() chronomap: ChronomapDatabase;

  marked = marked;

  constructor() { }

  ngOnInit(): void {
  }

}
