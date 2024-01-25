import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, WritableSignal, effect } from '@angular/core';

import { zoom, D3ZoomEvent, zoomIdentity } from 'd3-zoom';
import { select, Selection } from 'd3-selection';
import { scaleTime, ScaleTime } from 'd3-scale';
import { axisTop, Axis } from 'd3-axis';
import { timeFormat } from 'd3-time-format';
import { easeQuadInOut } from 'd3-ease';
import 'd3-transition';
import { debounceTime, mergeWith, Subject, timer, first, ReplaySubject, scheduled, animationFrameScheduler, tap } from 'rxjs';
import { MediaIconComponent } from '../media-icon/media-icon.component';
import { ChronomapDatabase, TimelineItem } from '../data.service';
import { LayoutService } from '../layout.service';
import { RtlDetectDirective } from '../rtl-detect.directive';

@Component({
  selector: 'app-time-line',
  templateUrl: './time-line.component.html',
  styleUrls: ['./time-line.component.less'],
  host: {
    '[class.visible]': 'hovered? hovered() : true',
  }
})
export class TimeLineComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() id = '';
  @Input() minDate: Date = new Date(1820, 0, 1);
  @Input() maxDate: Date = new Date(2120, 0, 1);
  @Input() chronomap: ChronomapDatabase;
  @Input() state: WritableSignal<string | null>;
  @Input() date: WritableSignal<Date | null>;
  @Input() includeTime: WritableSignal<boolean>;
  @Input() showHovers = true;
  @Input() hoverable = true;
  @Input() limitless = false;
  @Input() hovered: WritableSignal<boolean>;;

  @Output() selected = new EventEmitter<any>();

  WIDTH = 1000;
  TEXT_HEIGHT = 16;
  TICK_HEIGHT = 56;
  TICK_HEIGHT_INNER = 16;
  CIRCLE_RADIUS_CLUSTERED = 12;
  CIRCLE_RADIUS = 16;
  ICON_PADDING = 4;
  HOVER_HEIGHT = 34;
  HEIGHT = this.TEXT_HEIGHT + this.TICK_HEIGHT/2 + this.CIRCLE_RADIUS + this.HOVER_HEIGHT;
  RANDOM_CENTERS: any = {};

  @ViewChild('timeLine') timeline: ElementRef;

  x: ScaleTime<number, number, number>;
  xt: ScaleTime<number, number, number>;
  g: Selection<SVGGElement, unknown, HTMLElement, any>;
  points: Selection<SVGGElement, unknown, HTMLElement, any>;
  xAxis: Axis<Date>;
  tickIndicator = 0;
  firstTickValue: number;
  firstInit = false;
  svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
  hovers: Selection<HTMLDivElement, unknown, HTMLElement, any>;
  zoomBehaviour: any;
  zoomX: Date;
  zoomK = 1;
  zooming = false;
  controlled = false;
  
  _changed = new ReplaySubject<void>(1);
  _changeCandidates = new Subject<{state: string, timestamp: Date, includeTime: boolean}>();
  _externalChanges = new Subject<string>();
  resizeObserver: ResizeObserver;
  currentHover: number | null = null;

  constructor(private el: ElementRef, private layout: LayoutService) {
    this.resizeObserver = new ResizeObserver(() => {
      this._changed.next();
    });
    scheduled(this._changeCandidates, animationFrameScheduler).pipe(
      tap((change) => {
        this.state?.set(change.state);
        this.date?.set(change.timestamp);
        this.includeTime?.set(change.includeTime);
        if (!this.zooming) {
          this.zooming = true;
          // console.log(this.id, 'ZOOMING ON');
        }
      }),
      debounceTime(500)
    ).subscribe(() => {
      this.zooming = false;
      // console.log(this.id, 'ZOOMING OFF');
    });
    scheduled(this._externalChanges, animationFrameScheduler).pipe(
      tap((state) => {
        if (!this.controlled) {
          this.controlled = true;
          // console.log(this.id, 'CONTROLLED ON');
        }
        this.parseState(state);
        this.applyState();
      }),
      debounceTime(500)
    ).subscribe(() => {
      this.controlled = false;
      // console.log(this.id, 'CONTROLLED OFF');
    });
    effect(() => {
      const state = this.state ? this.state() : '';
      if (!this.zooming) {
        this._externalChanges.next(state || '');
      }
      const items = this.chronomap.timelineItems();
      if (items) {
        this.updateAxis();
      }
    });
  }

  parseState(state: string): void {
    const parts = state.split('/');
    if (parts.length >= 2) {
      this.zoomX = new Date(parseFloat(parts[0]));
      this.zoomK = parseFloat(parts[1]);
    }
    if (parts.length === 4) {
      this.firstTickValue = parseFloat(parts[2]);
      this.tickIndicator = parseInt(parts[3], 10);
      // console.log(this.id, 'STATE', this.state(), this.zoomX, this.zoomK);
    }
  }

  ngOnInit(): void {
      this.parseState(this.state() || '');
  }

  ngAfterViewInit(): void {
    this.resizeObserver.observe(this.el.nativeElement);
    this._changed.pipe(
      mergeWith(timer(0))
    ).subscribe(() => {
      this.WIDTH = this.el.nativeElement.offsetWidth;
      this.init();
    });
  }

  ngOnChanges() {
    // console.log('CHANGED', this.items.length, this.state);
    this._changed.next();
  }

  init() {
    this.timeline.nativeElement.innerHTML = '';
    this.zoomBehaviour = zoom<SVGSVGElement, unknown>();
    if (!this.limitless) {
      this.zoomBehaviour = this.zoomBehaviour
          .scaleExtent([1, 100000])
          .translateExtent([[0, 0], [this.WIDTH, 0]]);
    }
    this.zoomBehaviour = this.zoomBehaviour.on('zoom', (e: D3ZoomEvent<SVGSVGElement, unknown>) => this.onZoom(e))
    this.svg = select<SVGSVGElement, unknown>(this.timeline.nativeElement)
                    .append('svg')
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .call(this.zoomBehaviour)
                    .call((selection) => this.hoverable ? selection : selection.on('wheel.zoom', null));
    this.svg.append('rect')
            .attr('transform', `translate(0, ${this.HEIGHT - this.TEXT_HEIGHT})`)
            .attr('width', this.WIDTH)
            .attr('height', this.TEXT_HEIGHT)
            .attr('fill', '#fff');
    
    this.hovers = select<HTMLDivElement, unknown>(this.timeline.nativeElement)
                    .append('div')
                    .attr('class', 'hovers');

    this.g = this.svg.append('g')
                  .attr('transform', `translate(0, ${this.HEIGHT - this.TEXT_HEIGHT})`)
                  .attr('class', 'axis axis--x');
    this.points = this.svg.append('g')
                   .attr('class', 'points' + (this.hoverable ? ' hoverable' : ''));

    this.svg.attr('viewBox', `0 0 ${this.WIDTH} ${this.HEIGHT}`);
    this.x = scaleTime()
                  .domain([this.minDate, this.maxDate])
                  .range([0, this.WIDTH]);
    this.xt = this.x;
    this.xAxis = axisTop<Date>(this.x)
                    .ticks(this.layout.mobile() ? 12 : 40)
                    .tickSizeInner(this.TICK_HEIGHT)
                    .tickFormat((val, idx) => this.tickFormat(val, idx));
    this.updateAxis();
    this.applyState();
  }

  applyState() {
    if (this.zoomX && this.svg && this.zoomK) {
      const newX = this.x(this.zoomX) * this.zoomK;
      this.svg.call(this.zoomBehaviour.transform, zoomIdentity.translate(this.WIDTH/2 - newX, 0).scale(this.zoomK))
    }
  }

  public zoomBy(k: number) {
    // this.zoomK *= k;
    // this.applyState();
    this.svg.transition()
            .duration(300)
            .ease(easeQuadInOut)
            .call(this.zoomBehaviour.scaleBy, k);
  }

  public scrollTo(date: Date, item: any) {
    const newX = this.x(date) * this.zoomK;
    this.svg.transition()
            .duration(1000)
            .ease(easeQuadInOut)
            .call(this.zoomBehaviour.transform, zoomIdentity.translate(this.WIDTH/2 - newX, 56).scale(this.zoomK))
    item.niceTimestamp = this.tickFormat(date, -1);
  }

  clusterPoints(points: TimelineItem[]) {

    const dropPending = (pending: TimelineItem[], clustered: TimelineItem[]) => {
      if (pending.length) {
        const center = pending.reduce((acc, cur) => cur.x + acc, 0) / pending.length;
        const first = pending[0].timestamp;
        const last = pending[pending.length - 1].timestamp;
        const diff = this.x(last) - this.x(first);
        const centerDate = new Date((first.valueOf() + last.valueOf()) / 2)
        let k = 10000;
        if (diff > 0) {
          k = this.WIDTH / 2 / diff;
          if (k < 1) {
            k = 1;
          }
        } 
        pending.forEach((item, index) => {
          item.x = center;
          item.centerTimestamp = centerDate;
          item.k = k;
          item.clustered = pending.length;
          item.indexes = pending.map((i) => i.index);
          if (index !== pending.length - 1) {
            if (!this.RANDOM_CENTERS[index]) {
              this.RANDOM_CENTERS[index] = {
                cx: Math.random() * 3,
                cy: Math.random() * 3
              };
            }
            Object.assign(item, this.RANDOM_CENTERS[index]);
          }
        });
        clustered.push(...pending);
      }
      return [];
    }

    points.forEach(item => {
      item.x = this.xt(item.timestamp);
      item.cx = 0;
      item.cy = 0;
    });
    const clustered: TimelineItem[] = [];
    let pending: TimelineItem[] = [];
    let lastX: number | null = null;
    for (const item of points) {
      const itemX = item.x;
      if (lastX === null) {
        pending.push(item);
      } else if (itemX - lastX < this.CIRCLE_RADIUS * 2) {
        pending.push(item);
      } else {
        pending = dropPending(pending, clustered);
        pending.push(item);
      }
      lastX = itemX;
    }
    dropPending(pending, clustered);
    return clustered;
  }

  onPointClick(item: TimelineItem) {
    if (item.clustered > 1) {
      this.zoomK = item.k;
      this.scrollTo(item.centerTimestamp, item);
    } else {
      // console.log('click', item);
      this.scrollTo(item.timestamp, item);
      this.selected.next(item);
    }
  }

  iconDataUrl(item: TimelineItem) {
    let content = MediaIconComponent.getCodeForType(item.type, this.chronomap.primaryColor());
    content = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
    content = `data:image/svg+xml;base64,` + btoa(content);
    return content;
  }

  public updateHovers(setTo: number | null = -1) {
    if (setTo !== -1) {
      this.currentHover = setTo;
    }
    if (this.showHovers) {
      this.hovers.selectAll('.hover')
      .style('display', (d: any) => {
       return d.index === this.currentHover ? 'flex' : 'none';
      })
      .style('transform', (d: any) => `translate(${d.x}px, 0)`);
    }
    this.updatePoints();
  }

  updatePoints() {
    const points = this.points.selectAll('.point');
    points
        .attr('transform', (d: any) => `translate(${d.x}, ${this.CIRCLE_RADIUS + this.HOVER_HEIGHT})`);
    points
        .select('circle.point-bg')
        .attr('cx', (d: any) => d.cx)
        .attr('cy', (d: any) => d.cy)
        .attr('r', (d: any) => d.indexes.indexOf(this.currentHover) < 0 && d.clustered > 1 ? this.CIRCLE_RADIUS_CLUSTERED - 1 : this.CIRCLE_RADIUS - 1)
        .style('stroke', (d: any) => 
            d.indexes.indexOf(this.currentHover) >= 0 ? 
                this.chronomap.primaryColor()+'40':
                (d.clustered > 1 ? this.chronomap.primaryColor()+'40' : 'none'))
        .style('fill', (d: any) => 
            d.indexes.indexOf(this.currentHover) >= 0 ?
              'white' :
              (d.clustered > 1 ? 'white' : 'none'))
    points
        .select('image')
        .style('display', (d: any) => d.clustered > 1 ? 'none' : null);
    points
        .select('.cluster-size')
        .text((d: any) => d.clustered)
        .style('display', (d: any) => d.clustered === 1 ? 'none' : null);

  }

  updateAxis() {
    const items: TimelineItem[] = this.chronomap.timelineItems();
    this.g.call(this.xAxis.scale(this.xt))
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll(".tick line")
                       .attr('y2', (d: any, i) => {
                        d = d.getTime();
                        this.updateIndicator(d, i);
                        if (i % 2 === this.tickIndicator) {
                          return -this.TICK_HEIGHT;
                        } else {
                          return -this.TICK_HEIGHT_INNER;
                        }
                      }));
    this.g.selectAll('text') 
        .style('text-anchor', 'middle')
        .attr('dy', 3 + this.TEXT_HEIGHT + this.TICK_HEIGHT);
      
    const clustered = this.clusterPoints(items);
    let points = this.points.selectAll('.point')
        .data(clustered, (d: any) => d.id);
    const newPoints = points.enter()
        .append('g')
        .attr('class', d => 'point' + (d.clustered === 1 ? ' single' : ''))
        .call((points) => {
          points
            .on('click', (event: Event, d: TimelineItem) => {
              if (this.hoverable || d.clustered > 1) {
                this.onPointClick(d)
                event.stopPropagation();
              }
            })
            .on('mouseenter', (ev: Event, d: TimelineItem) => {
              // console.log('mouseenter', d.title);
              if (this.hoverable || d.clustered > 1) {
                if (this.currentHover !== null) {
                  this.updateHovers(null);
                }
                this.updateHovers(d.index);
              }
            })
            .on('mouseleave', (ev: Event, d: TimelineItem) => {
              // console.log('mouseleave', d.title);
              if (this.hoverable || d.clustered > 1) {
                if (this.currentHover && d.indexes.indexOf(this.currentHover) >= 0) {
                  this.updateHovers(null);
                }
              }
            });
        });
    newPoints
        .append('circle')
        .attr('class', 'point-inactive')
        .attr('r', d => d.clustered > 1 ? 0 : 3)
        .style('fill', this.chronomap.primaryColor()); //'rgba(252, 13, 28, 0.25)');
    newPoints
        .append('circle')
        .attr('class', d => 'point-bg' + (d.clustered === 1 ? ' single' : ''))
        .attr('r', (d: any) => d.clustered > 1 ? this.CIRCLE_RADIUS_CLUSTERED - 1 : this.CIRCLE_RADIUS - 1)
        .style('stroke', this.chronomap.primaryColor() + '40')//'rgba(252, 13, 28, 0.25)')
        // .style('stroke-opacity', 0.25)
        .style('fill', '#fff');
    let hovers = this.hovers.selectAll('.hover')
              .data(clustered, (d: any) => d.id);
    hovers.enter()
          .append('div')
          .attr('class', 'hover')
          .style('display', 'none')
          .append('span')
          .style('border-color', this.chronomap.primaryColor())
          .style('color', this.chronomap.primaryColor())
          .style('background', `linear-gradient(90deg, ${this.chronomap.primaryColor()}40, ${this.chronomap.primaryColor()}40), #fff`)
          .style('direction', (d: TimelineItem) => RtlDetectDirective.getDirection(d.title))
          .text((d: TimelineItem) => d.title);
    hovers.exit().remove();

    newPoints
        .append('image')
        .attr('x', -(this.CIRCLE_RADIUS - this.ICON_PADDING))
        .attr('y', -(this.CIRCLE_RADIUS - this.ICON_PADDING))
        .attr('width', (this.CIRCLE_RADIUS - this.ICON_PADDING) * 2)
        .attr('height', (this.CIRCLE_RADIUS - this.ICON_PADDING) * 2)
        .attr('xlink:href', (d) => this.iconDataUrl(d));
        // .attr('xlink:href', (d: any) => `assets/img/icon-time-line-${d.type}.svg`);
    newPoints
        .append('text')
        .attr('class', 'cluster-size')
        .style('fill', this.chronomap.primaryColor())
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .attr('dy', 1);
    points.exit().remove();

    this.updatePoints();
    this.updateHovers();
  }

  onZoom(event: D3ZoomEvent<SVGSVGElement, unknown>) {
    this.xt = event.transform.rescaleX(this.x);
    this.zoomX = this.xt.invert(this.WIDTH/2);
    this.zoomK = event.transform.k;
    this.updateAxis();
    if (!this.controlled) {
      const includeTime = (this.xt.invert(this.WIDTH).getTime() - this.xt.invert(0).getTime()) < 1000 * 60 * 60 * 24 * 3;
      this._changeCandidates.next({
        state: `${this.zoomX.valueOf()}/${this.zoomK}/${this.firstTickValue}/${this.tickIndicator}`,
        timestamp: this.xt.invert(this.WIDTH/2),
        includeTime
      });
    }
  }

  updateIndicator(d: number, i: number) {
    if (i === 0) {
      if (d !== this.firstTickValue) {
        this.firstTickValue = d;
        this.tickIndicator = 1 - this.tickIndicator;
      }
    }
  }

  tickFormat(val: Date, i: number) {
    if (i !== -1) {      
      this.updateIndicator(val.getTime(), i);
      if (i % 2 !== this.tickIndicator) {
        return '';
      }
    }
    let diff: number = this.xt.invert(this.WIDTH).getTime() - this.xt.invert(0).getTime();
    let fmt = '';
    const onTheHour = (val.getMinutes() === 0 && val.getSeconds() === 0 && val.getMilliseconds() === 0);
    const onTheDay = onTheHour && (val.getHours() === 0);
    const onTheYear = onTheDay && (val.getDate() === 1 && val.getMonth() === 0);

    diff = diff / 1000 / 60 / 60; // in hours
    if (diff < 5) { // less than five hour, show seconds
      if (onTheDay) {
        fmt = '%Y %b %-d %H:%M:%S';
      } else {
        fmt = '%H:%M:%S';
      }
    } else if (diff < 7 * 24) { // less than a week, show hours:minutes
      if (onTheDay) {
        fmt = '%Y %b %-d';
      } else {
        fmt = '%-I%p';
      }
    } else if (diff < 5 * 30 * 24) { // less than five months, show month:day
      if (onTheYear) {
        fmt = '%Y %b %-d';
      } else {
        fmt = '%b %-d';
      }
    } else if (diff < 5 * 365.25* 24) { // less than two years, show month
      if (onTheYear) {
        fmt = '%b %Y';
      } else {
        fmt = '%b';
      }
    } else {
      fmt = '%Y';
    }
    return `${timeFormat(fmt)(val)}`;
  }

}
