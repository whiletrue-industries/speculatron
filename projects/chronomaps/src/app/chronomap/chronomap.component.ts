import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, effect, signal } from '@angular/core';
import { DomSanitizer, SafeStyle, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MAPBOX_BASE_STYLE, MAPBOX_STYLE } from 'CONFIGURATION';
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
      logoPosition: this.layout.mobile() ? 'top-left' : 'bottom-right',
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
      this.updateMarkers();
      this.initialize();
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
      delay(1000),
      tap(() => {
        const scrollLeft = (item.index + 0.5) * (this.detailWidth);
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

  updateMarkers() {
    this.markers.forEach((marker) => {
      marker.remove();
    });
    this.markersTimeline = this.chronomap.timelineItems().slice();
    timer(100).subscribe(() => {
      const conf: {el: HTMLElement, map: mapboxgl.Map}[] = [
        {el: this.baseMarkersElement.nativeElement, map: this.baseMap},
        {el: this.detailMarkersElement.nativeElement, map: this.detailMap},
      ];
      for (const c of conf) {
        const markers = c.el.children;
        for (let i=0; i<markers.length; i++) {
          const markerEl = markers[i] as HTMLElement; 
          const item = this.chronomap.timelineItems()[i];
          const options = this.parseMapView(item.geo);
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

  parseMapView(view: string): mapboxgl.FlyToOptions {
    if (!view) {
      return {};
    }
    const geoConcat = view.split('#')[1];
    if (!geoConcat) {
      return {};
    }
    const parsed = geoConcat.split('/');
    if (parsed !== null) {
      const options: mapboxgl.FlyToOptions = {
        zoom: parseFloat(parsed[0]),
        center: {
          lat: parseFloat(parsed[1]),
          lon: parseFloat(parsed[2]),
        },
      };
      if (parsed.length > 3) {
        options.pitch = parseFloat(parsed[3]);
      }
      if (parsed.length > 4) {
        options.bearing = parseFloat(parsed[4]);
      }
      // if (view.curve) {
      //   options.curve = view.curve;
      // }
      // if (view.speed) {
      //   options.speed = view.speed;
      // }
      return options;
    } else {
      return {};
    }
  }

  applyMapView(item: TimelineItem, map: mapboxgl.Map, extraOptions: any = null) {
    const options = Object.assign({}, this.parseMapView(item.geo), extraOptions || {});
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
