import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { VisibilityDetector } from '../visibility-detector';
import { ChronomapDatabase, TimelineItem } from '../../data.service';

@Component({
  selector: 'app-content-item',
  templateUrl: './content-item.component.html',
  styleUrls: ['./content-item.component.less'],
})
export class ContentItemComponent implements OnInit, AfterViewInit {

  @Input() content: TimelineItem;
  @Input() contentType: string;
  @Input() activeItem: TimelineItem;
  @Input() parentElement: HTMLElement;

  @Input() chronomap: ChronomapDatabase;

  @Output() mapView = new EventEmitter<any>();
  @Output() activated = new EventEmitter<any>();


  visibleDetector: VisibilityDetector;
  activeDetector: VisibilityDetector;
  contentVisible = false;

  constructor(private el: ElementRef) {
    this.visibleDetector = new VisibilityDetector();
    this.activeDetector = new VisibilityDetector();
  }

  ngOnInit(): void {
    this.activeDetector.detected.subscribe((active) => {
      if (active) {
        this.activated.next(this.content);
      }
    });
    this.visibleDetector.detected.subscribe((visible) => {
      this.contentVisible = this.contentVisible || visible;
    });
  }

  ngAfterViewInit() {
    const el: HTMLElement = this.el.nativeElement;
    this.visibleDetector.initVisibilityDetector(el, this.parentElement, 'visible');
    this.activeDetector.initVisibilityDetector(el, this.parentElement, 'active');
  }

}
