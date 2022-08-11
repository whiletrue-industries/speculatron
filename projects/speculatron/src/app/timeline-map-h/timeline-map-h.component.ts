import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { MAPBOX_STYLE, PRIMARY_COLOR } from 'CONFIGURATION';
import * as mapboxgl from 'mapbox-gl';
import { MapService } from '../map.service';
import { TimelineMapService } from '../timeline-map.service';
import { BaseTimelineMapComponent } from '../timeline-map-base/base-timeline';
import { timer, tap, delay, debounceTime, Subject, filter, first } from 'rxjs';
import { TimeLineComponent } from './time-line/time-line.component';

@Component({
  selector: 'app-timeline-map-h',
  templateUrl: './timeline-map-h.component.html',
  styleUrls: ['./timeline-map-h.component.less']
})
export class TimelineMapHComponent extends BaseTimelineMapComponent implements OnInit, AfterViewInit {

  @Input() id: string;
  @Input() title: SafeHtml;
  @Input() subtitle: SafeHtml;
  @Input() infobarTitle: string;
  @Input() infobarSubtitle: string;
  @Input() api: TimelineMapService;

  @ViewChild('baseMapEl', {static: true}) baseMapEl: ElementRef;
  @ViewChild('detailMapEl', {static: true}) detailMapEl: ElementRef;
  @ViewChild('timeLine') timeLineComponent: TimeLineComponent;
  @ViewChild('scroller') scrollerComponent: ElementRef;
  @ViewChild('baseMarkers') baseMarkersElement: ElementRef;
  @ViewChild('detailMarkers') detailMarkersElement: ElementRef;

  // Maps
  baseMap: mapboxgl.Map;
  detailMap: mapboxgl.Map;
  maps: mapboxgl.Map[] = [];
  syncing: boolean;

  // App State
  minDate: Date;
  maxDate: Date;
  initialTimelineState: string | null = null;
  zoomState: string;
  detailOpen: boolean;
  contentVisible: boolean;
  currentItem: any = {};
  selectedItemId: string | null = null;
  itemActivations = new Subject<any>();

  // Layout
  resizeObserver: ResizeObserver;
  baseMapWidth: string = '100%';
  detailWidth: string = '50%';
  changing: number = 0;
  markers: mapboxgl.Marker[] = []
  markersTimeline: any[] = [];

  constructor(activatedRoute: ActivatedRoute, private mapSvc: MapService) {
    super(activatedRoute);  
    this.resizeObserver = new ResizeObserver(() => {
      timer(0).subscribe(() => {
        this.syncWidths();
      });
    });
    this.itemActivations.pipe(
      filter(() => this.changing === 0),
      debounceTime(1000)
    ).subscribe((item: any) => {
      console.log('ACTIVATED', item.title);
      this.itemSelected(item);
    });
  }

  ngOnInit(): void {
    this.initialize(this.api);
    this.api.data.subscribe(() => {
      this.saveState();
      this.updateMarkers();
    });
  }

  ngAfterViewInit(): void {
    this.baseMap = new mapboxgl.Map({
      container: this.baseMapEl.nativeElement,
      style: MAPBOX_STYLE,
      minZoom: 3,
      attributionControl: false,
      logoPosition: 'top-right',
    });
    this.baseMap.addControl(new mapboxgl.AttributionControl(), 'top-right');
    this.baseMap.addControl(new mapboxgl.NavigationControl(), 'top-left');
    this.detailMap = new mapboxgl.Map({
      container: this.detailMapEl.nativeElement,
      style: MAPBOX_STYLE,
      minZoom: 3,
      attributionControl: false,
      logoPosition: 'top-right',
    });
    this.detailMap.on('style.load', () => {
      this.loadMapViews();
      // this.detailMap.setLayoutProperty('satellite-night', 'visibility', 'visible');
      this.syncMaps();
      timer(0).subscribe(() => {
        console.log('RESIZE');
        window.dispatchEvent(new Event('resize'));
      });
    });
    this.resizeObserver.observe(this.baseMapEl.nativeElement);
    timer(0).subscribe(() => {
      this.syncWidths();
      this.updateMarkers();
    });
  }

  syncMaps() {
    this.maps = [this.baseMap, this.detailMap];
    for (const map of this.maps) {
      map.on('move', () => {
        if (!this.syncing) {
          this.syncing = true;
          for (const otherMap of this.maps) {
            if (map !== otherMap) {
              otherMap.setCenter(map.getCenter());
              otherMap.setZoom(map.getZoom());
              otherMap.setPitch(map.getPitch());
              otherMap.setBearing(map.getBearing());
            }
          }
          this.syncing = false;
        }
      });
    }
  }

  get baseWidth() {
    return this.baseMapEl?.nativeElement?.offsetWidth;
  }

  syncWidths() {
    this.baseMapWidth = this.baseWidth + 'px';
    this.detailWidth = (this.baseWidth/2) + 'px';
  }

  override setTimeline(timeline: any[]): void {
    super.setTimeline(timeline);
    const minDate = this.timeline[0].timestamp.valueOf();
    const maxDate = this.timeline[this.timeline.length - 1].timestamp.valueOf();
    const diff = maxDate - minDate;
    this.minDate =  new Date(minDate - diff / 10);
    this.maxDate =  new Date(maxDate + diff / 10);
  }

  override goto(location: string) {
    console.log('GOTO', location);
    const params = location.split('/');
    if (params.length > 0) {
      this.initialTimelineState = params[0];
      if (params.length > 1) {
        const authors = params[1].split(',');
        for (const author of this.api.authorsList) {
          if (authors.includes(author.hash)) {
            author.selected = true;
          } else {
            author.selected = false;
          }
        }
        this.api.updateTimeline();
        if (params.length > 2) {
          const item = this.timeline.find(t => t.id === params[2]);
          if (item) {
            timer(1000).subscribe(() => {
              this.itemSelected(item);
            });
          }
        }
      }
    } else {
      console.log('NO STATE');
      this.initialTimelineState = '';
    }
  }

  saveState() {
    let state = `${this.zoomState}`;
    const authors = this.api.authorsList.filter((author) => author.selected).map(a => a.hash);
    state += `/${authors.join(',')}`;
    if (this.selectedItemId) {
      state += `/${this.selectedItemId}`;
    }
    this.updateLocation(state);
  }

  timelineStateChanged(state: string) {
    this.zoomState = state;
    this.saveState();
  }

  itemActivated(item: any) {
    if (item) {
      this.itemActivations.next(item);
    }
  }

  itemSelected(item: any) {
    console.log('SELECTING ITEM', item);
    if (!item) {
      this.selectedItemId = null;
      this.saveState();
      timer(0).pipe(
        tap(() => {
          this.detailOpen = false;
        }),
        delay(1000)
      ).subscribe(() => {
        this.currentItem = {};
        this.contentVisible = false;
        this.updateMarkers();
      });
      return;
    }
    this.currentItem = item;
    this.selectedItemId = item.id;
    this.saveState();
    timer(0).pipe(
      tap(() => {
        this.timeLineComponent?.scrollTo(item.timestamp, item);    
      }),
      delay(0),
      tap(() => {
        this.detailOpen = true;
        this.contentVisible = true;
        if (item.map_view && item.map_view.length) {
          this.applyMapView(item.map_view[0], this.detailMap);
        } else {
          this.applyMapView(item.title, this.detailMap);
        }
        this.updateMarkers();
      }),
      delay(100),
    ).subscribe(() => {
      const scrollLeft = (item.index + 0.5) * (this.baseWidth/2);
      const el = this.scrollerComponent.nativeElement as HTMLElement;
      console.log('SCROLL', scrollLeft, el.scrollLeft, this.baseWidth/2, item.index);
      el.scrollLeft = scrollLeft;
      // children[item.index].scrollIntoView({behavior: 'smooth'});
    });
    this.changing += 1;
    timer(2500).subscribe(() => {
      this.changing -= 1;
    });
  }

  markerColor(item: any) {
    if (item.marker_style === 'Light') {
      return '#e0e0e0'; // gray5
    } else if (item.marker_style === 'Dark') {
      return '#333333'; // gray1
    }
    return PRIMARY_COLOR;
  }

  updateMarkers() {
    this.markers.forEach((marker) => {
      marker.remove();
    });
    this.markersTimeline = this.timeline.slice();
    timer(100).subscribe(() => {
      const conf: {el: HTMLElement, map: mapboxgl.Map}[] = [
        {el: this.baseMarkersElement.nativeElement, map: this.baseMap},
        {el: this.detailMarkersElement.nativeElement, map: this.detailMap},
      ];
      this.mapViews.pipe(first()).subscribe((mapViews) => {
        for (const c of conf) {
          const markers = c.el.children;
          for (let i=0; i<markers.length; i++) {
            const markerEl = markers[i] as HTMLElement; 
            const item = this.timeline[i];
            let mapViewName = item.title;
            if (item.map_view && item.map_view.length) {
              mapViewName = item.map_view[0];
            }
            const mapView: any = mapViews[mapViewName];
            const options = this.parseMapView(mapView);
            const coordinates = options.center as mapboxgl.LngLatLike;
            const clonedElement = markerEl.cloneNode(true) as HTMLElement;
            clonedElement.addEventListener('click', () => {
              console.log('CLICK', item.title);
              this.itemSelected(item);
            });
            this.markers.push(
                new mapboxgl.Marker(clonedElement)
                      .setLngLat(coordinates)
                      .addTo(c.map));
          }
        }
      });
    });
  }
}
