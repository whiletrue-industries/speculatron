import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { MapService } from '../../map.service';

import * as mapboxgl from 'mapbox-gl';
import * as MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

import { MapSelectorService } from '../../map-selector.service';
import { ChronomapDatabase } from '../../data.service';

@Component({
  selector: 'app-map-selector',
  templateUrl: './map-selector.component.html',
  styleUrls: ['./map-selector.component.less']
})
export class MapSelectorComponent implements AfterViewInit {

  @Input() chronomap: ChronomapDatabase;
  @Input() flyToOptions: mapboxgl.FlyToOptions;

  @ViewChild('mapEl', {static: true}) mapEl: ElementRef;
  
  theMap: mapboxgl.Map;

  constructor(private mapSvc: MapService, private mapSelector: MapSelectorService) { }

  ngAfterViewInit(): void {
    this.chronomap.ready.subscribe(() => {
      this.theMap = new mapboxgl.Map({
        container: this.mapEl.nativeElement,
        style: this.chronomap.backgroundMapStyle(),
        minZoom: 3,
        center: this.flyToOptions.center,
        zoom: this.flyToOptions.zoom,
        bearing: this.flyToOptions.bearing,
        pitch: this.flyToOptions.pitch,
      });
      var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        marker: false,
      });
      this.theMap.addControl(geocoder);
      this.theMap.addControl(new mapboxgl.NavigationControl({visualizePitch: true}), 'top-left');
      this.theMap.on('load', () => {
        // const options = MapService.parseMapView(this.chronomap.mapView());
        this.theMap.jumpTo(this.flyToOptions);
      });
      this.theMap.on('moveend', () => {
        const center = this.theMap.getCenter();
        const params = [this.theMap.getZoom(), center.lat, center.lng, this.theMap.getBearing(), this.theMap.getPitch()]
        const geo = 'https://labs.mapbox.com/location-helper/#' + params.map(p => p.toString()).join('/');
        this.mapSelector.submitMapResult(geo);
      });
    });
  }
}
