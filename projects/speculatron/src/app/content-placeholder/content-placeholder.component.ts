import { AfterViewInit, Component, ElementRef, Input, OnInit } from '@angular/core';
import { VisibilityDetector } from '../content/visibility-detector';

@Component({
  selector: 'app-content-placeholder',
  templateUrl: './content-placeholder.component.html',
  styleUrls: ['./content-placeholder.component.less']
})
export class ContentPlaceholderComponent implements OnInit, AfterViewInit {

  @Input() item: any;
  active = false;
  activeDetector = new VisibilityDetector();

  constructor(private el: ElementRef) {
    
  }

  ngOnInit(): void {
    this.activeDetector.detected.subscribe((value) => {
      this.active = value;
      if (value) {
        location.hash = '';
      }
    });
  }

  ngAfterViewInit() {
    const el: HTMLElement = this.el.nativeElement;
    this.activeDetector.initVisibilityDetector(el, el.parentElement, 'active');
  }

}
