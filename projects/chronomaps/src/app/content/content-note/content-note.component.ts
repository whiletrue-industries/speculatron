import { Component, Input, OnInit } from '@angular/core';
import { ChronomapDatabase, TimelineItem } from '../../data.service';
import { marked } from 'marked';

@Component({
  selector: 'app-content-note',
  templateUrl: './content-note.component.html',
  styleUrls: ['./content-note.component.less']
})
export class ContentNoteComponent implements OnInit {

  @Input() item: TimelineItem;
  @Input() chronomap: ChronomapDatabase;

  marked = marked;

  constructor() { }

  ngOnInit(): void {
  }

}
