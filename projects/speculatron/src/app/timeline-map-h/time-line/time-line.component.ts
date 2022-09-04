import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';

import { zoom, D3ZoomEvent, zoomIdentity } from 'd3-zoom';
import { select, Selection } from 'd3-selection';
import { scaleTime, ScaleTime } from 'd3-scale';
import { axisTop, Axis } from 'd3-axis';
import { timeFormat } from 'd3-time-format';
import { easeQuadInOut } from 'd3-ease';
import 'd3-transition';
import { debounceTime, mergeWith, Subject, timer, first, ReplaySubject } from 'rxjs';
import { MediaIconComponent } from '../../media-icon/media-icon.component';
import { PRIMARY_COLOR } from 'CONFIGURATION';

@Component({
  selector: 'app-time-line',
  templateUrl: './time-line.component.html',
  styleUrls: ['./time-line.component.less']
})
export class TimeLineComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() minDate: Date = new Date(1920, 0, 1);
  @Input() maxDate: Date = new Date(2020, 0, 1);
  @Input() items: any[] = [];
  @Input() state: string;
  @Output() changed = new EventEmitter<string>();
  @Output() selected = new EventEmitter<any>();

  WIDTH = 1000;
  TEXT_HEIGHT = 16;
  TICK_HEIGHT = 48;
  CIRCLE_RADIUS = 24;
  HOVER_HEIGHT = 34;
  HEIGHT = this.TEXT_HEIGHT + this.TICK_HEIGHT + 2*this.CIRCLE_RADIUS + this.HOVER_HEIGHT;
  RANDOM_CENTERS: any = {};
  PRIMARY_COLOR = PRIMARY_COLOR;

  @ViewChild('timeLine') timeline: ElementRef;

  x: ScaleTime<number, number, number>;
  xt: ScaleTime<number, number, number>;
  g: Selection<SVGGElement, unknown, HTMLElement, any>;
  points: Selection<SVGGElement, unknown, HTMLElement, any>;
  xAxis: Axis<Date>;
  tickIndicator = 0;
  firstTickValue: any;
  firstInit = false;
  svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
  hovers: Selection<HTMLDivElement, unknown, HTMLElement, any>;
  zoomBehaviour: any;
  zoomX: Date;
  zoomK = 1;
  
  _changed = new ReplaySubject<void>(1);
  _changeCandidates = new Subject<string>();
  resizeObserver: ResizeObserver;
  currentHover: number | null = null;

  constructor(private el: ElementRef) {
    this.resizeObserver = new ResizeObserver(() => {
      this._changed.next();
    });
    this._changeCandidates.pipe(
      debounceTime(500)
    ).subscribe((state) => {
      this.changed.next(state);
    })
  }

  ngOnInit(): void {
    const parts = this.state.split(':');
    if (parts.length >= 2) {
      this.zoomX = new Date(parseFloat(parts[0]));
      this.zoomK = parseFloat(parts[1]);
      console.log('STATE', this.state, this.zoomX, this.zoomK);
    } else {
      console.log('timelineState empty');
    }
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
    this.zoomBehaviour = zoom<SVGSVGElement, unknown>()
                    .scaleExtent([1, 100000])
                    .translateExtent([[0, 0], [this.WIDTH, 0]])
                    .on('zoom', (e) => this.onZoom(e))
    this.svg = select<SVGSVGElement, unknown>(this.timeline.nativeElement)
                    .append('svg')
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .call(this.zoomBehaviour);
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
                   .attr('class', 'points');

    this.svg.attr('viewBox', `0 0 ${this.WIDTH} ${this.HEIGHT}`);
    this.x = scaleTime()
                  .domain([this.minDate, this.maxDate])
                  .range([0, this.WIDTH]);
    this.xt = this.x;
    this.xAxis = axisTop<Date>(this.x)
                    .ticks(40)
                    .tickSizeInner(this.TICK_HEIGHT)
                    .tickFormat((val, idx) => this.tickFormat(val, idx));
    this.updateAxis();
    if (this.zoomX) {
      const newX = this.x(this.zoomX) * this.zoomK;
      this.svg.call(this.zoomBehaviour.transform, zoomIdentity.translate(this.WIDTH/2 - newX, 0).scale(this.zoomK))
    }
  }

  public zoomBy(k: number) {
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

  clusterPoints(points: any[]) {

    const dropPending = (pending: any[], clustered: any[]) => {
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
    const clustered: any[] = [];
    let pending: any[] = [];
    let lastX: number | null = null;
    for (const item of this.items) {
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

  onPointClick(item: any) {
    if (item.clustered > 1) {
      this.zoomK = item.k;
      this.scrollTo(item.centerTimestamp, item);
    } else {
      // console.log('click', item);
      this.scrollTo(item.timestamp, item);
      this.selected.next(item);
    }
  }

  iconDataUrl(item: any) {
    let content = MediaIconComponent.getCodeForType(item.type, PRIMARY_COLOR);
    content = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
    content = `data:image/svg+xml;base64,` + btoa(content);
    return content;
  }

  public updateHovers(setTo: number | null = -1) {
    if (setTo !== -1) {
      this.currentHover = setTo;
    }
    this.hovers.selectAll('.hover')
               .style('display', (d: any) => {
                // console.log('CHECK', this.currentHover, d.index);
                return d.index === this.currentHover ? 'flex' : 'none';
               })
               .style('transform', (d: any) => `translate(${d.x}px, 0)`);//${this.CIRCLE_RADIUS + this.HOVER_HEIGHT}px)`);
    this.updatePoints();
  }

  updatePoints() {
    const points = this.points.selectAll('.point');
    points
        .attr('transform', (d: any) => `translate(${d.x}, ${this.CIRCLE_RADIUS + this.HOVER_HEIGHT})`);
    points
        .select('circle')
        .attr('cx', (d: any) => d.cx)
        .attr('cy', (d: any) => d.cy)
        .style('fill', (d: any) => d.indexes.indexOf(this.currentHover) >= 0 ? PRIMARY_COLOR+'40' : '#fff')
    points
        .select('image')
        .style('display', (d: any) => d.clustered > 1 ? 'none' : null);
    points
        .select('.cluster-size')
        .text((d: any) => d.clustered)
        .style('display', (d: any) => d.clustered === 1 ? 'none' : null);

  }

  updateAxis() {
    this.g.call(this.xAxis.scale(this.xt))
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll(".tick line")
                       .attr('y2', (d: any, i) => {
                        d = `${d}`;
                        this.updateIndicator(d, i);
                        if (i % 2 === this.tickIndicator) {
                          return -this.TICK_HEIGHT;
                        } else {
                          return -this.TICK_HEIGHT / 3;
                        }
                      }));
    this.g.selectAll('text') 
        .style('text-anchor', 'middle')
        .attr('dy', this.TEXT_HEIGHT + this.TICK_HEIGHT);
      
    const clustered = this.clusterPoints(this.items);
    let points = this.points.selectAll('.point')
        .data(clustered, (d: any) => d.id);
    const newPoints = points.enter()
        .append('g')
        .attr('class', 'point')
        .on('click', (_, d: any) => this.onPointClick(d))
        .on('mouseenter', (ev: Event, d: any) => {
          // console.log('mouseenter', d.title);
          if (this.currentHover === null) {
            this.updateHovers(d.index);
          }
        })
        .on('mouseleave', (ev: Event, d: any) => {
          // console.log('mouseleave', d.title);
          if (d.indexes.indexOf(this.currentHover) >= 0) {
            this.updateHovers(null);
          }
        });
    newPoints
        .append('circle')
        .attr('r', this.CIRCLE_RADIUS-1)
        .style('stroke', PRIMARY_COLOR)//'rgba(252, 13, 28, 0.25)')
        .style('stroke-opacity', 0.25)
        .style('fill', '#fff');
    let hovers = this.hovers.selectAll('.hover')
              .data(clustered, (d: any) => d.id);
    hovers.enter()
          .append('div')
          .attr('class', 'hover')
          .style('display', 'none')
          .append('span')
          .style('border-color', PRIMARY_COLOR)
          .style('color', PRIMARY_COLOR)
          .style('background', `linear-gradient(90deg, ${PRIMARY_COLOR}40, ${PRIMARY_COLOR}40), #fff`)
          .text((d: any) => d.title);
    hovers.exit().remove();

    newPoints
        .append('image')
        .attr('x', -this.CIRCLE_RADIUS/2)
        .attr('y', -this.CIRCLE_RADIUS/2)
        .attr('width', this.CIRCLE_RADIUS)
        .attr('height', this.CIRCLE_RADIUS)
        .attr('xlink:href', (d) => this.iconDataUrl(d));
        // .attr('xlink:href', (d: any) => `assets/img/icon-time-line-${d.type}.svg`);
    newPoints
        .append('text')
        .attr('class', 'cluster-size')
        .style('fill', PRIMARY_COLOR)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle');
    points.exit().remove();

    this.updatePoints();
    this.updateHovers();
  }

  onZoom(event: D3ZoomEvent<SVGSVGElement, unknown>) {
    this.xt = event.transform.rescaleX(this.x);
    this.zoomX = this.xt.invert(this.WIDTH/2);
    this.zoomK = event.transform.k;
    this._changeCandidates.next(`${this.zoomX.valueOf()}:${this.zoomK}`);
    this.updateAxis();
  }

  updateIndicator(d: string, i: number) {
    if (i === 0) {
      if (d !== this.firstTickValue) {
        this.firstTickValue = d;
        this.tickIndicator = 1 - this.tickIndicator;
      }
    }
  }

  tickFormat(val: Date, i: number) {
    if (i !== -1) {      
      this.updateIndicator(`${val}`, i);
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
