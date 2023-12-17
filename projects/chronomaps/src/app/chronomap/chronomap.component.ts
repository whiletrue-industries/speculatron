import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, effect, signal } from '@angular/core';
import { DomSanitizer, SafeStyle, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MAPBOX_BASE_STYLE, MAPBOX_STYLE } from 'CONFIGURATION';
import * as mapboxgl from 'mapbox-gl';
import { MapService } from '../map.service';
import { timer, tap, delay, debounceTime, Subject, filter, first, switchMap, Observable, scheduled, animationFrameScheduler, throttleTime } from 'rxjs';
import { TimeLineComponent } from '../time-line/time-line.component';
import { MapSelectorService } from '../map-selector.service';
import { ChronomapDatabase, TimelineItem } from '../data.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

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
  mapMode = 'Media';
  lastMapState: mapboxgl.FlyToOptions;
  selectItemMapState: mapboxgl.FlyToOptions;
  fragmentChanger = new Subject<void>();

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
  
  constructor(
    private activatedRoute: ActivatedRoute, private mapSvc: MapService,
    private titleSvc: Title, private sanitizer: DomSanitizer, public mapSelector: MapSelectorService
  ) {
    this.resizeObserver = new ResizeObserver(() => {
      timer(0).subscribe(() => {
        this.syncWidths();
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
        this.fragmentChanger.next();
      }
      this.titleSvc.setTitle(this.chronomap.title());
    });
  }

  ngOnInit(): void {
    this.updateMarkers();
    // this.contentBackground = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(180deg, ${PRIMARY_COLOR}00 68.75%, ${PRIMARY_COLOR}33 90.62%), ${PRIMARY_COLOR}66`);
    this.backdropBackground = this.sanitizer.bypassSecurityTrustStyle(`linear-gradient(180deg, ${this.chronomap.primaryColor()}00 10.32%, ${this.chronomap.primaryColor()}80 35.85%)`);
    console.log('CT BG', this.contentBackground);
    this.chronomap.ready.pipe(
      switchMap(() => this.fragmentChanger),
      untilDestroyed(this),
      throttleTime(500, animationFrameScheduler),
      debounceTime(500)
    ).subscribe(() => {
      this.saveState();
    });  
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

  goto(location: string) {
    console.log('GOTO', location);
    const params = location.split('@@');
    if (params.length > 0) {
      this.timelineState.set(params[0]);
      if (params.length > 1) {
        // const authors = params[1].split(',').filter(a => a.length > 0);
        // for (const author of this.api.authorsList) {
        //   if (authors.includes(author.hash) || (authors.length === 0 && author.originalAuthor)) {
        //     author.selected = true;
        //   } else {
        //     author.selected = false;
        //   }
        // }
        // this.api.updateTimeline();
        // if (params.length > 2) {
        const item = this.chronomap.timelineItems().find(t => t.id.toString() === params[1]);
        if (item) {
          timer(1000).subscribe(() => {
            this.itemSelected(item);
          });
        }
        // }
      } else {
        this.itemSelected(null);
      }
    } else {
      console.log('NO STATE');
      this.timelineState.set('');
      this.itemSelected(null);
    }
  }

  saveState(replace=true) {
    console.log('SAVING STATE', this.zoomState);
    if (!this.zoomState) {
      return;
    }
    let state = this.zoomState.split('@').slice(0, 2).join('@');
    // const authors = this.api.authorsList.filter((author) => author.selected).map(a => a.hash);
    // state += `/${authors.join(',')}`;
    if (this.selectedItemId) {
      state += `@@${this.selectedItemId}`;
    }
    this.updateLocation(state, replace);
  }

  itemActivated(item: any) {
    if (item) {
      this.itemActivations.next(item);
    }
  }

  itemSelected(item: TimelineItem | null) {
    console.log('SELECTING ITEM', item);
    if (!item) {
      this.selectedItemId = null;
      this.saveState(true);
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
        this.currentItem = null;
        this.contentVisible = false;
        this.updateMarkers();
      });
      return;
    }
    this.currentItem = item;
    this.selectedItemId = item.id;
    this.saveState(true);
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
        this.applyMapView(item, this.detailMap, options);
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
      untilDestroyed(this),
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
    if (this.mapMode === 'Map') {
      this.mapMode = 'Media';
    } else {
      this.mapMode = 'Map';
    }
  }

  mapModeColor(mode: string) {
    return this.chronomap.primaryColor();
  }

  initialize() {
    this.chronomap.ready.pipe(
      untilDestroyed(this),
      switchMap(() => this.activatedRoute.fragment),
      first(),
      delay(1000),
    ).subscribe((fragment) => {
      if (fragment) {
          this.goto(fragment);
      }
    });
    if (!this.activatedRoute.snapshot.fragment) {
      this.goto('');
    }
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
          lon: parseFloat(parsed[1]),
          lat: parseFloat(parsed[2]),
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
