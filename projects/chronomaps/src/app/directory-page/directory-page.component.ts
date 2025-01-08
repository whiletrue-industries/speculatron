import { AfterViewInit, Component, ElementRef, ViewChild, effect, signal } from '@angular/core';
import { DataService } from '../data.service';
import { marked } from 'marked';
import { LayoutService } from '../layout.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { animationFrameScheduler, debounceTime, filter, first, fromEvent, merge, tap, throttleTime, timer } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@UntilDestroy()
@Component({
    selector: 'app-directory-page',
    templateUrl: './directory-page.component.html',
    styleUrl: './directory-page.component.less',
    standalone: false
})
export class DirectoryPageComponent implements AfterViewInit {

  timelineState = signal<string>('');
  minDate = signal<Date>(new Date());
  maxDate = signal<Date>(new Date());

  arrowRight = signal<number>(0);
  alignment: {[key: string]: number} = {};
  fullDescription = signal<boolean>(false);
  titleOpen = signal<boolean>(false);

  marked = marked;

  @ViewChild('title') title: ElementRef<HTMLDivElement>;
  startY: number;

  constructor(public data: DataService, public layout: LayoutService, private route: ActivatedRoute) {
    route.params.subscribe((params) => {
      const dbId = parseInt(params['dbid']);
      this.data.fetchData(dbId);
    });
    effect(() => {
      let minDate: Date|null = null;
      let maxDate: Date|null = null;
      this.data.directory.chronomaps().forEach((chronomap) => {
        chronomap.timelineItems().forEach((item) => {
          if (item.post_timestamp) {
            if (!minDate || item.post_timestamp < minDate) {
              minDate = item.post_timestamp;
            }
            if (!maxDate || item.post_timestamp > maxDate) {
              maxDate = item.post_timestamp;
            }
          }
        });
      });
      minDate = minDate || new Date();
      maxDate = maxDate || new Date();
      const delta = (maxDate.getTime() - minDate.getTime()) / 10;
      minDate = new Date(minDate.getTime() - delta);
      maxDate = new Date(maxDate.getTime() + delta);
      const minView = new Date(this.data.directory.zoomFrom(), 0, 1);
      const maxView = new Date(this.data.directory.zoomUntil(), 11, 31);
      const midView = new Date((minView.getTime() + maxView.getTime()) / 2).getTime();
      const zoom = Math.max(0, (maxDate.getTime() - minDate.getTime()) / (maxView.getTime() - minView.getTime()));
      this.timelineState.set(`${midView}/${zoom}`);
      this.minDate.set(minDate);
      this.maxDate.set(maxDate);

      if (!this.titleOpen()) {
        this.title?.nativeElement?.scrollTo({top: 0, behavior: 'smooth'});
      }
    }, {allowSignalWrites: true});
  }

  ngAfterViewInit(): void {
      fromEvent(this.title.nativeElement, 'scroll').pipe(
        untilDestroyed(this),
        debounceTime(0, animationFrameScheduler),
      ).subscribe(() => {
        this.titleOpen.set(this.title.nativeElement.scrollTop > 0);
        if (this.title.nativeElement.scrollTop < 0) {
          this.title.nativeElement.scrollTop = 0;
        }
      });
      fromEvent<TouchEvent>(this.title.nativeElement, 'touchstart').pipe(
        untilDestroyed(this),
      ).subscribe((event) => {
        if (!this.titleOpen()) {
          this.titleOpen.set(true);
          event.stopPropagation();
          this.startY = event.touches[0].clientY;
          merge(
            fromEvent<TouchEvent>(this.title.nativeElement, 'touchend'),
            fromEvent<TouchEvent>(this.title.nativeElement, 'touchmove').pipe(
              throttleTime(16, animationFrameScheduler),
            )
          ).pipe(
            tap((event: TouchEvent) => {
              if (event.type === 'touchmove') {
                const delta = this.startY - event.touches[0].clientY;
                this.title.nativeElement.scrollTop = delta < 0 ? 0 : delta;
              }
            }),
            filter((event: TouchEvent) => event.type === 'touchend'),
            first(),
          ).subscribe(() => {
            this.titleOpen.set(this.title.nativeElement.scrollTop > 0);
          });
        }
      });
  }

  align(id: string, width: number) {
    this.alignment[id] = width;
    const min = Math.min(...Object.values(this.alignment));
    this.arrowRight.set(min);
  }

  get titleBoxShadow() {
    return `0px 0px 20px 1px ${this.data.directory.primaryColor()}40`;
  }

  openTitle() {
    if (this.layout.mobile()) {
      this.title.nativeElement.scrollTo({top: 10000, behavior: 'smooth'});
    }
  }
}
