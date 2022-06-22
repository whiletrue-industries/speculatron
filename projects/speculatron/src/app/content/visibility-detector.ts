import { Observable, Subject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

export class VisibilityDetector  {

    visible$ = new Subject<boolean>();
    detected: Observable<boolean>;
    observer: IntersectionObserver;
  
    constructor() {
      this.detected = this.visible$.pipe(
        distinctUntilChanged()
      );
      this.visible$.next(false);
    }

    initVisibilityDetector(element: Element, rootElement: Element | null, kind: string) {
        // (this.el.nativeElement as HTMLElement).parentElement
        const rootMargin = {
          active: '-50% 0% -50% 0%',
          visible: '100% 0% 100% 0%'
        }[kind];
        const observerOptions = {
            root: rootElement,
            rootMargin: rootMargin,
            threshold: 0
          }
          this.observer = new IntersectionObserver((entries) => {
            this.visible$.next(entries[0].isIntersecting);
          }, observerOptions);
          this.observer.observe(element);      
    }

}
