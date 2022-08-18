import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeStyle } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { MAPBOX_BASE_STYLE, MAPBOX_STYLE, PRIMARY_COLOR } from 'CONFIGURATION';
import * as mapboxgl from 'mapbox-gl';
import { MapService } from '../map.service';
import { TimelineMapService } from '../timeline-map.service';
import { BaseTimelineMapComponent } from '../timeline-map-base/base-timeline';
import { timer, tap, delay, debounceTime, Subject, filter, first, map, switchMap, Observable } from 'rxjs';
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
  @ViewChild('description') descriptionElement: ElementRef;

  // Maps
  baseMap: mapboxgl.Map;
  detailMap: mapboxgl.Map;
  maps: mapboxgl.Map[] = [];
  syncing: boolean;
  moveEnd = new Subject<void>();
  moveEnded: Observable<void>;

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
  mapMode = 'Media';
  lastMapState: mapboxgl.FlyToOptions;
  selectItemMapState: mapboxgl.FlyToOptions;

  // Layout
  resizeObserver: ResizeObserver;
  baseWidthPx: string = '100%';
  detailWidth: number;
  detailWidthPx: string = '50%';
  changing: number = 0;
  markers: mapboxgl.Marker[] = []
  markersTimeline: any[] = [];
  contentBackground: SafeStyle;
  backdropBackground: SafeStyle;

  PRIMARY_COLOR = PRIMARY_COLOR;
  
  constructor(activatedRoute: ActivatedRoute, private mapSvc: MapService, private sanitizer: DomSanitizer) {
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
    this.moveEnded = this.moveEnd.pipe(
      debounceTime(1000)
    );
  }

  ngOnInit(): void {
    this.initialize(this.api);
    this.api.data.subscribe(() => {
      this.saveState();
      this.updateMarkers();
    });
    // this.contentBackground = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(180deg, ${PRIMARY_COLOR}00 68.75%, ${PRIMARY_COLOR}33 90.62%), ${PRIMARY_COLOR}66`);
    this.backdropBackground = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(180deg, ${PRIMARY_COLOR}00 10.32%, ${PRIMARY_COLOR}80 35.85%)`);
    console.log('CT BG', this.contentBackground);
  }

  ngAfterViewInit(): void {
    this.baseMap = new mapboxgl.Map({
      container: this.baseMapEl.nativeElement,
      style: MAPBOX_BASE_STYLE,
      minZoom: 3,
      attributionControl: false,
      logoPosition: 'top-right',
    });
    this.baseMap.addControl(new mapboxgl.AttributionControl({compact: true}), 'top-right');
    this.detailMap = new mapboxgl.Map({
      container: this.detailMapEl.nativeElement,
      style: MAPBOX_STYLE,
      minZoom: 3,
      attributionControl: false,
      logoPosition: window.innerWidth < 600 ? 'top-left' : 'bottom-right',
    });
    if (window.innerWidth > 600) {
      this.baseMap.addControl(new mapboxgl.NavigationControl(), 'top-left');
      this.detailMap.addControl(new mapboxgl.NavigationControl(), 'top-left');
    }
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
          this.lastMapState = {
            center: map.getCenter(),
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing(),
          };
          const jumpTo = Object.assign({
            padding: map.getPadding(),
          }, this.lastMapState);
          for (const otherMap of this.maps) {
            if (map !== otherMap) {
              otherMap.jumpTo(jumpTo);
            }
          }
          this.syncing = false;
        }
      });
      map.on('moveend', () => {
        timer(1000).subscribe(() => {
          this.moveEnd.next();
        });
      });
    }
  }

  get baseWidth() {
    return this.baseMapEl?.nativeElement?.offsetWidth;
  }

  syncWidths() {
    this.baseWidthPx = this.baseWidth + 'px';
    this.detailWidth = Math.min(this.baseWidth, Math.max(450, this.baseWidth/2));
    this.detailWidthPx = this.detailWidth + 'px';
  }

  getDetailWidth() {
    if (this.detailOpen) {
      if (this.mapMode === 'Map') {
        return '100%';
      } else {
        return this.detailWidthPx;
      }
    } else {
      return '0px';
    }
  }

  override setTimeline(timeline: any[]): void {
    super.setTimeline(timeline);
    console.log('TIMELINE', timeline);
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
        const authors = params[1].split(',').filter(a => a.length > 0);
        for (const author of this.api.authorsList) {
          if (authors.includes(author.hash) || (authors.length === 0 && author.originalAuthor)) {
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
    if (!this.zoomState) {
      return;
    }
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
          if (this.detailOpen) {
            this.baseMap.flyTo({
              center: this.selectItemMapState.center,
              zoom: this.selectItemMapState.zoom,
              bearing: this.selectItemMapState.bearing,
              pitch: this.selectItemMapState.pitch,
              padding: 0,
            });
          }  
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
    this.changing += 1;
    timer(0).pipe(
      tap(() => {
        this.timeLineComponent?.scrollTo(item.timestamp, item);    
      }),
      delay(0),
      tap(() => {
        if (!this.detailOpen) {
          this.mapMode = 'Media';
          this.selectItemMapState = this.lastMapState;
        }
        this.detailOpen = true;
        this.contentVisible = true;
        const options: mapboxgl.FlyToOptions = {
          speed: 2
        };
        if (item.map_view && item.map_view.length) {
          this.applyMapView(item.map_view[0], this.detailMap, options);
        } else {
          this.applyMapView(item.title, this.detailMap, options);
        }
        this.updateMarkers();
      }),
      delay(100),
      tap(() => {
        const scrollLeft = (item.index + 0.5) * (this.detailWidth);
        const el = this.scrollerComponent.nativeElement as HTMLElement;
        // console.log('SCROLL', scrollLeft, el.scrollLeft, this.detailWidth, item.index);
        el.scrollLeft = scrollLeft;
        // children[item.index].scrollIntoView({behavior: 'smooth'});
        timer(1000).subscribe(() => {
          this.changing -= 1;
        });
      }),
      switchMap(() => {
        return this.moveEnded;
      }),
    ).subscribe(() => {
      if (window.innerWidth > 600 && this.detailOpen) {
        const wh = window.innerHeight;
        const padding = 2*this.descriptionElement.nativeElement.getBoundingClientRect().top + 24 - wh;
        for (const map of this.maps) {
          map.flyTo(Object.assign({}, this.lastMapState, {padding: {top: padding}}));
        }
      }
    });
  }

  markerColor(item: any) {
    if (item) {
      if (item.marker_style === 'Light') {
        return '#e0e0e0'; // gray5
      } else if (item.marker_style === 'Dark') {
        return '#333333'; // gray1
      }  
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
            if (item.marker === 'None') {
              continue;
            }
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
            clonedElement.addEventListener('mouseenter', () => {
              this.timeLineComponent.updateHovers(item.index);
            });
            clonedElement.addEventListener('mouseleave', () => {
              this.timeLineComponent.updateHovers(null);
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

  toggleMapMode() {
    if (this.mapMode === 'Map') {
      this.mapMode = 'Media';
    } else {
      this.mapMode = 'Map';
    }
  }

  mapModeColor(mode: string) {
    if (mode === this.mapMode) {
      return PRIMARY_COLOR;
    } else {
      return '#ffffffc0';
    }
  }
}
