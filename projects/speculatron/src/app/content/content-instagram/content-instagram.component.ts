import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-content-instagram',
  templateUrl: './content-instagram.component.html',
  styleUrls: ['./content-instagram.component.less']
})
export class ContentInstagramComponent implements OnInit {

  @Input() item: any;

  constructor() { }

  ngOnInit(): void {
  }

}
