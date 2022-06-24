import { ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { VisibilityDetector } from './visibility-detector';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.less']
})
export class ContentComponent implements OnInit, AfterViewInit {

  @Input() item: any;
  @Input() active = false;
  @Output() mapView = new EventEmitter<any>();

  contentType = '';
  content: any = null;
  contentVisible = false;
  visibleDetector: VisibilityDetector;
  activeDetector: VisibilityDetector;

  constructor(private el: ElementRef) {
    this.visibleDetector = new VisibilityDetector();
    this.activeDetector = new VisibilityDetector();
  }

  ngOnInit(): void {
    this.activeDetector.detected.subscribe((active) => {
      // console.log('CONTENT ACTIVE', active, this.item);
      this.active = active;
      if (active) {
        this.handleGeo();
        location.replace(location.pathname + '#Y' + this.item.year);
      }
    });
    this.visibleDetector.detected.subscribe((visible) => {
      // console.log('CONTENT VISIBLE', visible, this.item);
      this.contentVisible = this.contentVisible || visible;
    });
    if (this.item.hasContent) {
      this.content = this.item;
      this.contentType = this.content.type;
    }
  }

  ngAfterViewInit() {
    const el: HTMLElement = this.el.nativeElement;
    this.visibleDetector.initVisibilityDetector(el, el.parentElement, 'visible');
    this.activeDetector.initVisibilityDetector(el, el.parentElement, 'active');
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