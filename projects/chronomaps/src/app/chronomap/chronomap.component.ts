import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, effect, signal } from '@angular/core';
import { DomSanitizer, SafeStyle, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import * as mapboxgl from 'mapbox-gl';
import { MapService } from '../map.service';
import { timer, tap, delay, debounceTime, Subject, filter, first, switchMap, Observable, scheduled, animationFrameScheduler, throttleTime, Subscription } from 'rxjs';
import { TimeLineComponent } from '../time-line/time-line.component';
import { MapSelectorService } from '../map-selector.service';
import { ChronomapDatabase, TimelineItem } from '../data.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { State, StateService } from '../state.service';
import { LayoutService } from '../layout.service';
import { marked } from 'marked';

@UntilDestroy()
@Component({
  selector: 'app-chronomap',
  templateUrl: './chronomap.component.html',
  styleUrls: ['./chronomap.component.less']
})
export class ChronomapComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() chronomap: ChronomapDatabase;  

  @ViewChild('baseMapEl', {static: true}) baseMapEl: ElementRef;
  @ViewChild('detailMapEl', {static: true}) detailMapEl: ElementRef;
  @ViewChild('timeLine') timeLineComponent: TimeLineComponent;
  @ViewChild('scroller') scrollerComponent: ElementRef;
  @ViewChild('baseMarkers') baseMarkersElement: ElementRef;
  @ViewChild('detailMarkers') detailMarkersElement: ElementRef;
  @ViewChild('description') descriptionElement: ElementRef;

  @ViewChild('contentFiller', {static: false}) contentFiller: ElementRef<HTMLDivElement>;
  @ViewChild('contentItem', {static: false}) contentItem: ElementRef<HTMLDivElement>;
  @ViewChild('contentDescription', {static: false}) contentDescription: ElementRef<HTMLDivElement>;
  @ViewChild('contentRoot') contentRoot: ElementRef<HTMLDivElement>;

  // Maps
  baseMap: mapboxgl.Map;
  detailMap: mapboxgl.Map;
  maps: mapboxgl.Map[] = [];
  syncing: boolean;
  moveEnd = new Subject<void>();
  moveEnded: Observable<void>;

  // App State
  timelineState = signal<string | null>('');
  zoomState: string;
  detailOpen: boolean;
  contentVisible: boolean;
  currentItem: TimelineItem | null = null;
  selectedItemId: number | null = null;
  itemActivations = new Subject<any>();
  mapMode: 'Map' | 'SmallMap' | 'Media' | 'More' = 'Media';
  mapModeSetter = new Subject<'Map' | 'SmallMap' | 'Media' | 'More'>();
  lastMapState: mapboxgl.FlyToOptions;
  selectItemMapState: mapboxgl.FlyToOptions;
  fragmentChanger = new Subject<void>();
  actionSub: Subscription | null;
  observer: IntersectionObserver;

  // Layout
  resizeObserver: ResizeObserver;
  baseWidthPx: string = '100%';
  detailWidth: number;
  detailWidthPx: string = '50%';
  changing: number = 0;
  markers: mapboxgl.Marker[] = []
  markersTimeline: TimelineItem[] = [];
  contentBackground: SafeStyle;
  backdropBackground: SafeStyle;
  
  marked = marked;

  constructor(
    private titleSvc: Title, private sanitizer: DomSanitizer, public mapSelector: MapSelectorService, public state: StateService,
    private layout: LayoutService, private el: ElementRef
  ) {
    this.resizeObserver = new ResizeObserver(() => {
      timer(0).subscribe(() => {
        this.syncWidths();
        this.maps.forEach((map) => {
          map.resize();
        });
      });
    });
    this.itemActivations.pipe(
      untilDestroyed(this),
      filter(() => this.changing === 0),
      debounceTime(1000)
    ).subscribe((item: any) => {
      console.log('ACTIVATED', item.title);
      this.itemSelected(item);
    });
    this.moveEnded = this.moveEnd.pipe(
      debounceTime(1000)
    );
    effect(() => {
      const state = this.timelineState();
      if (state) {
        this.zoomState = state;
        this.state.timelineState = state;
      }
      this.titleSvc.setTitle(this.chronomap.title());
    }, {allowSignalWrites: true});
    this.mapModeSetter.pipe(
      untilDestroyed(this),
      debounceTime(1000)
    ).subscribe((mode) => {
      this.mapMode = mode;
    });
  }

  ngOnInit(): void {
    this.updateMarkers();
    // this.contentBackground = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(180deg, ${PRIMARY_COLOR}00 68.75%, ${PRIMARY_COLOR}33 90.62%), ${PRIMARY_COLOR}66`);
    this.backdropBackground = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(180deg, ${this.chronomap.primaryColor()}00 10.32%, ${this.chronomap.primaryColor()}80 35.85%)`);
    console.log('CT BG', this.contentBackground);
  }

  ngAfterViewInit(): void {
    this.chronomap.ready.subscribe(() => {
      (mapboxgl as any).accessToken = this.chronomap.mapboxKey();
      this.baseMap = new mapboxgl.Map({
        container: this.baseMapEl.nativeElement,
        style: this.chronomap.backgroundMapSytle(),
        minZoom: 3,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });
      this.baseMap.addControl(new mapboxgl.AttributionControl({compact: true}), 'top-right');
      this.baseMap.on('style.load', () => {
        if (this.chronomap.mapView()) {
          this.baseMap.flyTo(MapService.parseMapView(this.chronomap.mapView()));
        }
        this.updateMarkers(!this.chronomap.mapView());
      });
      this.detailMap = new mapboxgl.Map({
        container: this.detailMapEl.nativeElement,
        style: this.chronomap.mapStyle(),
        minZoom: 3,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });
      if (this.layout.desktop()) {
        this.baseMap.addControl(new mapboxgl.NavigationControl(), 'top-left');
        this.detailMap.addControl(new mapboxgl.NavigationControl(), 'top-left');
      }
      this.detailMap.on('style.load', () => {
        this.syncMaps();
        timer(0).subscribe(() => {
          console.log('RESIZE');
          window.dispatchEvent(new Event('resize'));
      });
      });
      this.resizeObserver.observe(this.el.nativeElement);
      timer(0).subscribe(() => {
        this.syncWidths();
        this.initialize();
      });
    });
  }

  ngOnDestroy() {
    this.resizeObserver.disconnect();
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
    timer(100).subscribe(() => {
      const el = this.scrollerComponent.nativeElement as HTMLElement;
      el.querySelector('.current')?.scrollIntoView({behavior: 'smooth', inline: 'center'});
    });
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

  goto(state: State) {
    this.timelineState.set(state.timelineState);
    const item = this.chronomap.timelineItems().find(t => t.id === state.selectedItemId) || null;
    this.itemSelected(item);
  }

  itemActivated(item: any) {
    if (item) {
      this.itemActivations.next(item);
    }
  }

  itemSelected(item: TimelineItem | null) {
    if (item === this.currentItem) {
      return;
    }
    console.log('SELECTING ITEM', item);
    this.state.selectedItemId = item?.id || null;
    if (!item) {
      this.selectedItemId = null;
      this.actionSub?.unsubscribe();
      this.actionSub = timer(0).pipe(
        tap(() => {
          if (this.detailOpen) {
            this.baseMap.flyTo({
              center: this.selectItemMapState.center,
              zoom: this.selectItemMapState.zoom,
              bearing: this.selectItemMapState.bearing,
              pitch: this.selectItemMapState.pitch,
              padding: 0,
              duration: 1000,
            });
          }  
          this.detailOpen = false;
        }),
        delay(1000)
      ).subscribe(() => {
        this.currentItem = null;
        this.contentVisible = false;
        this.updateMarkers();
        this.actionSub = null;
        this.observer?.disconnect();
      });
      return;
    }
    this.currentItem = item;
    this.selectedItemId = item.id;
    this.changing += 1;
    this.actionSub?.unsubscribe();
    this.actionSub = timer(0).pipe(
      tap(() => {
        this.timeLineComponent?.scrollTo(item.timestamp, item);    
      }),
      delay(this.detailOpen ? 0 : 1000),
      tap(() => {
        if (!this.detailOpen) {
          this.mapMode = 'SmallMap';
          this.contentFiller.nativeElement?.scrollIntoView({behavior: 'auto'});
          this.selectItemMapState = this.lastMapState;
        } else {
          this.contentItem.nativeElement?.scrollIntoView({behavior: 'smooth'});
        }
        this.detailOpen = true;
        this.contentVisible = true;
        const options: mapboxgl.FlyToOptions = {
          speed: 2
        };
        this.applyMapView(item, this.detailMap, options);
        this.updateMarkers();
      }),
      delay(3000),
      tap(() => {
        const el = this.scrollerComponent.nativeElement as HTMLElement;
        el.querySelector('.current')?.scrollIntoView({behavior: 'smooth', inline: 'center'});
        console.log('SCROLL', el.querySelector('.current'));
        // el.scrollLeft = scrollLeft;
        // children[item.index].scrollIntoView({behavior: 'smooth'});
        timer(1000).subscribe(() => {
          this.changing -= 1;
        });
      }),
      switchMap(() => {
        return this.moveEnded;
      }),
      first(),
      delay(500),
      tap(() => {
        console.log('MOVE ENDED');
        this.contentItem.nativeElement?.scrollIntoView({behavior: 'smooth'});
      })
    ).subscribe(() => {
      this.observer?.disconnect();
      this.observer = new IntersectionObserver((entries) => {
        entries = entries.filter((entry) => entry.isIntersecting).sort((a, b) => { return b.intersectionRatio - a.intersectionRatio; })
        const entry = entries[0];
        let mode: 'Map' | 'SmallMap' | 'Media' | 'More' | null = null;
        if (entry.isIntersecting) {
          if (entry.target === this.contentItem.nativeElement) {
            mode = 'Media';
          } else if (entry.target === this.contentDescription.nativeElement) {
            mode = 'More';
          } else if (entry.target === this.contentFiller.nativeElement) {
            mode = 'Map';
          }
          console.log('INTERSECTING', entries.length, entry.isIntersecting, entry.intersectionRatio, mode);
          if (mode) {
            this.mapModeSetter.next(mode);
          }
        }
      }, {threshold: 0.75, root: this.contentRoot.nativeElement });
      console.log('INTERSECTING start');
      this.observer.observe(this.contentItem.nativeElement);
      this.observer.observe(this.contentDescription.nativeElement);
      this.observer.observe(this.contentFiller.nativeElement);
      // TODO:
      // if (this.layout.desktop() && this.detailOpen) {
      //   const wh = window.innerHeight;
      //   const padding = 2*this.descriptionElement.nativeElement.getBoundingClientRect().top + (30 + 12) * 2 - wh;
      //   console.log('MOVE ENDED - padding', padding);
      //   for (const map of this.maps) {
      //     map.flyTo(Object.assign({}, this.lastMapState, {padding: {top: padding}}));
      //   }
      // }
      this.actionSub = null;
    });
  }

  markerColor() {
    return this.chronomap.primaryColor();
  }

  updateMarkers(updateMap = false) {
    this.markers.forEach((marker) => {
      marker.remove();
    });
    this.markersTimeline = this.chronomap.timelineItems().slice();
    timer(100).subscribe(() => {
      const conf: {el: HTMLElement, map: mapboxgl.Map}[] = [
        {el: this.baseMarkersElement.nativeElement, map: this.baseMap},
        {el: this.detailMarkersElement.nativeElement, map: this.detailMap},
      ];
      let maxLat = -90;
      let minLat = 90;
      let maxLon = -180;
      let minLon = 180;
      for (const c of conf) {
        const markers = c.el.children;
        for (let i=0; i<markers.length; i++) {
          const markerEl = markers[i] as HTMLElement; 
          const item = this.chronomap.timelineItems()[i];
          const options = MapService.parseMapView(item.geo);
          const coordinates = options.center as { lon: number; lat: number };
          maxLat = Math.max(maxLat, coordinates.lat);
          minLat = Math.min(minLat, coordinates.lat);
          maxLon = Math.max(maxLon, coordinates.lon);
          minLon = Math.min(minLon, coordinates.lon);
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
      if (updateMap) {
        const bounds = new mapboxgl.LngLatBounds([minLon, minLat], [maxLon, maxLat]);
        this.baseMap.fitBounds(bounds, {animate: false, padding: 50});
      }
    });
  }

  toggleMapMode() {
    if (this.mapMode === 'Map' || this.mapMode === 'SmallMap') {
      this.contentItem.nativeElement?.scrollIntoView({behavior: 'smooth'});
    } else {
      this.contentFiller.nativeElement?.scrollIntoView({behavior: 'smooth'});
    }
  }

  toggleDescriptionMode() {
    if (this.mapMode === 'More') {
      this.contentItem.nativeElement?.scrollIntoView({behavior: 'smooth'});
    } else {
      this.contentDescription.nativeElement?.scrollIntoView({behavior: 'smooth'});
    }
  }

  initialize() {
    this.chronomap.ready.pipe(
      untilDestroyed(this),
      switchMap(() => this.state.state),
    ).subscribe((state) => {
      this.goto(state);
    });
  }

  applyMapView(item: TimelineItem, map: mapboxgl.Map, extraOptions: any = null) {
    const options = Object.assign({}, MapService.parseMapView(item.geo), extraOptions || {});
    for (const l of item.map_layers || []) {
      if (map.getLayer(l)) {
        map.setLayoutProperty(l, 'visibility', 'visible');
      }
    }
    for (const l of item.off_map_layers || []) {
      if (map.getLayer(l)) {
        map.setLayoutProperty(l, 'visibility', 'none');
      }
    }
    map.flyTo(options);
  }

  updateLocation(fragment: string, replace: boolean = false) {
    if (replace) {
      location.replace(location.pathname + '#' + fragment);
    } else {
      location.hash = fragment;
    }
  }
}
