import { ElementRef } from "@angular/core";
import * as mapboxgl from "mapbox-gl";
import { ChronomapDatabase, TimelineItem } from "../data.service";
import { MapUtils } from "./map-utils";
import { LayoutService } from "../layout.service";
import { debounceTime, Observable, Subject, timer } from "rxjs";

export class MapHandler {
  detailMapEl: ElementRef<any>;
  baseMapEl: ElementRef<any>;
  baseMarkersEl: ElementRef<any>;
  detailMarkersEl: ElementRef<any>;
  
  baseMap: mapboxgl.Map;
  detailMap: mapboxgl.Map;
  maps: mapboxgl.Map[] = [];
  chronomap: ChronomapDatabase;

  lastMapState: mapboxgl.FlyToOptions;
  
  itemSelected = new Subject<TimelineItem>();
  itemHovered = new Subject<TimelineItem | null>();

  // Internal
  syncing: boolean;
  moveEnd = new Subject<void>();
  moveEnded: Observable<void>;
  markers: mapboxgl.Marker[] = []

  constructor(private owner: any, private layout: LayoutService) {
    this.moveEnded = this.moveEnd.pipe(
      debounceTime(1000)
    );
  }
  
  public init(
    chronomap: ChronomapDatabase,
    base: ElementRef, detail: ElementRef,
    baseMarkers: ElementRef, detailMarkers: ElementRef,
  ) {
    this.baseMapEl = base;
    this.detailMapEl = detail;
    this.baseMarkersEl = baseMarkers;
    this.detailMarkersEl = detailMarkers;
    this.chronomap = chronomap;
    
    (mapboxgl as any).accessToken = this.chronomap.mapboxKey();
    this.baseMap = new mapboxgl.Map({
      container: this.baseMapEl.nativeElement,
      style: this.chronomap.backgroundMapStyle(),
      minZoom: 3,
      attributionControl: false,
      logoPosition: 'bottom-right',
    });
    this.baseMap.addControl(new mapboxgl.AttributionControl({compact: true}), 'top-right');
    this.baseMap.on('style.load', () => {
      if (this.chronomap.mapView()) {
        this.baseMap.flyTo(MapUtils.parseMapView(this.chronomap.mapView()));
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
    this.maps = [this.baseMap, this.detailMap];
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
    this.updateMarkers();
  }
  
  public resize() {
    this.maps.forEach((map) => {
      map.resize();
    });
  }

  public flyTo(options: mapboxgl.FlyToOptions) {
    options = Object.assign({}, {
      center: this.baseMap.getCenter(),
      zoom: this.baseMap.getZoom(),
      bearing: this.baseMap.getBearing(),
      pitch: this.baseMap.getPitch(),
    }, options);
    this.baseMap.flyTo(options);
  }
  
  updateMarkers(updateMap=false) {
    this.markers.forEach((marker) => {
      marker.remove();
    });
    timer(100).subscribe(() => {
      const conf: {el: HTMLElement, map: mapboxgl.Map}[] = [
        {el: this.baseMarkersEl.nativeElement, map: this.baseMap},
        {el: this.detailMarkersEl.nativeElement, map: this.detailMap},
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
          const options = MapUtils.parseMapView(item.geo);
          const coordinates = options.center as { lon: number; lat: number };
          maxLat = Math.max(maxLat, coordinates.lat);
          minLat = Math.min(minLat, coordinates.lat);
          maxLon = Math.max(maxLon, coordinates.lon);
          minLon = Math.min(minLon, coordinates.lon);
          const clonedElement = markerEl.cloneNode(true) as HTMLElement;
          clonedElement.addEventListener('click', () => {
            console.log('CLICK', item.title);
            this.itemSelected.next(item);
          });
          clonedElement.addEventListener('mouseenter', () => {
            this.itemHovered.next(item);
          });
          clonedElement.addEventListener('mouseleave', () => {
            this.itemHovered.next(null);
          });
          this.markers.push(
              new mapboxgl.Marker(clonedElement)
                    .setLngLat(coordinates)
                    .addTo(c.map));
        }
      }
      if (updateMap) {
        const bounds = new mapboxgl.LngLatBounds([minLon, minLat], [maxLon, maxLat]);
        console.log('FIT BOUNDS', bounds);
        this.baseMap.fitBounds(bounds, {animate: false, padding: 50});
      }
    });
  }

  private syncMaps() {
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

  applyMapView(item: TimelineItem, extraOptions: any = null) {
    const options = Object.assign({}, MapUtils.parseMapView(item.geo), extraOptions || {});
    for (const l of item.map_layers || []) {
      if (this.detailMap.getLayer(l)) {
        this.detailMap.setLayoutProperty(l, 'visibility', 'visible');
      }
    }
    for (const l of item.off_map_layers || []) {
      if (this.detailMap.getLayer(l)) {
        this.detailMap.setLayoutProperty(l, 'visibility', 'none');
      }
    }
    this.detailMap.flyTo(options);
  }
}