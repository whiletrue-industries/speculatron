import { ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { VisibilityDetector } from './visibility-detector';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.less']
})
export class ContentComponent implements OnInit {

  @Input() item: any;
  @Input() activeItem: any = null;
  @Output() mapView = new EventEmitter<any>();
  @Output() activated = new EventEmitter<any>();

  contentType = '';
  content: any = null;

  constructor(public el: ElementRef) {
  }

  ngOnInit(): void {
    if (this.item.hasContent) {
      this.content = this.item;
      this.contentType = this.content.type;
    }
  }

  onActivated(item: any) {
    if (item) {
      this.handleGeo();
      this.activated.next(item);
    }
  }

  handleGeo() {
    let mapView = null;
    if (this.item.map_view && this.item.map_view.length) {
      mapView = this.item.map_view[0];
      this.mapView.next(mapView);
    } else {
      this.mapView.next(this.item.title);
    }
  }

  classes() {
    if (this.item && this.item.variants) {
      return this.item.variants.join(' ');
    }
    return '';
  }
}