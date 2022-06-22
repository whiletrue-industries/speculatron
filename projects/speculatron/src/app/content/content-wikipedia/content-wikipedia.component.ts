import { Component, Input, OnInit } from '@angular/core';
import { marked } from 'marked';
@Component({
  selector: 'app-content-wikipedia',
  templateUrl: './content-wikipedia.component.html',
  styleUrls: ['./content-wikipedia.component.less']
})
export class ContentWikipediaComponent implements OnInit {

  @Input() item: any;
  marked = marked;

  constructor() { }

  ngOnInit(): void {
  }

}
