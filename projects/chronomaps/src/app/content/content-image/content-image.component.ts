import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-content-image',
  templateUrl: './content-image.component.html',
  styleUrls: ['./content-image.component.less']
})
export class ContentImageComponent implements OnInit {

  @Input() item: any;

  constructor() { }

  ngOnInit(): void {
  }

}
