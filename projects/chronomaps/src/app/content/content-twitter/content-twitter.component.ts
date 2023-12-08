import { Component, Input, OnInit } from '@angular/core';
import * as dayjs from 'dayjs';
import { marked  } from 'marked';

@Component({
  selector: 'app-content-twitter',
  templateUrl: './content-twitter.component.html',
  styleUrls: ['./content-twitter.component.less']
})
export class ContentTwitterComponent implements OnInit {

  @Input() item: any;
  marked = marked;

  constructor() { }

  ngOnInit(): void {
  }

  get timestamp() {
    return dayjs(this.item.post_timestamp).format(('h:mm A - MMM D, YYYY'));
  }
}
