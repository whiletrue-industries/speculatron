import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[rtlDetect]',
    standalone: false
})
export class RtlDetectDirective implements AfterViewInit {

  @Input() rtlDetect: string;

  constructor(private el: ElementRef) { }

  ngAfterViewInit(): void {
    const el = this.el.nativeElement;
    el.style.direction = RtlDetectDirective.getDirection(this.rtlDetect);
  }

  static getDirection(text: string): 'rtl' | 'ltr' {
    const rtl = text && text.match(/^[\s#_*]*[\u0590-\u05FF]/);
    if (rtl) {
      return 'rtl';
    } else {
      return 'ltr';
    }
  }
}
