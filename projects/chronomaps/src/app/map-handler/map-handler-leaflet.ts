import { MapHandler } from './map-handler-base';
import { BoundsOptions, FlyToOptions, MapUtils } from './map-utils';
import * as L from 'leaflet';


export class MapHandlerLeaflet extends MapHandler<L.Map, L.Marker> {

  private getBgLayer(): L.ImageOverlay | null {
    const backgroundUrl = this.chronomap.Map_BG();
    const boundsCommaSeparated = this.chronomap.Map_BG_Bounds();
    console.log('BBBBB__0', backgroundUrl, boundsCommaSeparated);
    if (!backgroundUrl || !boundsCommaSeparated) {
      return null;
    }
    const bounds = boundsCommaSeparated.split(',').map(parseFloat);
    console.log('BBBBB', backgroundUrl, bounds);
    return L.imageOverlay(backgroundUrl, [[bounds[0], bounds[1]], [bounds[2], bounds[3]]]);
  }

  private makeMap(el: HTMLElement): L.Map {
    const map = L.map(el, {
      crs: L.CRS.Simple,
      maxBounds: [[-1, -1], [1, 2]],
      center: [0, 0],
      zoom: 3,
      minZoom: 3,
      zoomControl: false,
      attributionControl: false,
    });
    this.getBgLayer()?.addTo(map);
    if (this.layout.desktop()) {
      map.addControl(L.control.zoom({ position: 'topleft' }));
    }
    return map;
  }

  override initMaps(): L.Map[] {
    let initCount = 0;
    this.baseMap = this.makeMap(this.baseMapEl.nativeElement);
    this.detailMap = this.makeMap(this.detailMapEl.nativeElement);

    L.tileLayer(this.chronomap.mapStyle()).addTo(this.detailMap);
    const maps = [this.baseMap, this.detailMap];
    this.baseMap.whenReady(() => {
      initCount += 1;
      if (initCount === 2) {
        this.initMapsComplete();
      }
    });
    this.detailMap.whenReady(() => {
      for (const map of maps) {
        map.on('move', () => {
          const center = map.getCenter();
          const jumpTo: FlyToOptions = {
          center: {
            lat: center.lat,
            lon: center.lng,
          },
          zoom: map.getZoom(),
          padding: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }
          };
          this.mapSyncMoveStart(map, jumpTo);
        });
        map.on('moveend', () => {
          this.mapSyncMoveEnd();
        });
      }
      initCount += 1;
      if (initCount === 2) {
        this.initMapsComplete();
      }
    });
    return maps;
  }

  override mapResize(map: L.Map): void {
    map.invalidateSize();
  }

  override mapFlyTo(map: L.Map, options: FlyToOptions): void {      
    options = Object.assign({}, {
      center: map.getCenter(),
      zoom: map.getZoom(),
    }, options);
    map.flyTo({
      lat: options.center?.lat || 0,
      lng: options.center?.lon || 0,
    }, options.zoom, options);
  }

  override mapJumpTo(map: L.Map, options: FlyToOptions): void {
    options = Object.assign({}, {
      center: map.getCenter(),
      zoom: map.getZoom(),
    }, options);
    map.flyTo({
      lat: options.center?.lat || 0,
      lng: options.center?.lon || 0,
    }, options.zoom, {
      animate: false,
      duration: 0,
    });
  }

  override mapApplyLayers(map: L.Map, layers: string[], offLayers: string[]): void {
  }

  override mapRemove(map: L.Map): void {
    map.remove();
  }

  override initSelectorMapAux(el: HTMLElement, position: FlyToOptions, interactive: boolean): L.Map {
    const map = new L.Map(el, {
      center: [position.center?.lat || 0, position.center?.lon || 0],
      zoom: position.zoom || 3,      
      minZoom: 3,
      attributionControl: false,
      dragging: interactive,     
      zoomControl: interactive, 
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: ''
    }).addTo(map);
    map.on('load', () => {
      this.mapJumpTo(map, position);
    });
    if (interactive) {
      map.on('moveend', () => {
        const center = map.getCenter();
        const position: FlyToOptions = {
          center: {
            lat: center.lat,
            lon: center.lng,
          },
          zoom: map.getZoom(),
        };
        this.selectorMapOnMove(position);
      });
    }
    return map;
  }

  override mapFitBounds(map: L.Map, bounds: BoundsOptions): void {
    const mpBounds = new L.LatLngBounds(bounds[0], bounds[1]);
    map.fitBounds(mpBounds, {animate: false, padding: [50, 50]});
  }

  override markerCreate(el: HTMLElement, coordinates: { lat: number; lon: number }, map: L.Map): L.Marker {
    const icon = L.divIcon({
      html: el,
      iconSize: [32, 32],
      className: 'leaflet-marker',
    });
    return L.marker([coordinates.lat, coordinates.lon], {icon}).addTo(map);
  }

  override markerRemove(marker: L.Marker): void {
    marker.remove();
  }
}
