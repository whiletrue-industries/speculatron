import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MAPBOX_STYLE } from '../../../../../CONFIGURATION';
import { MapService } from '../map.service';

import * as mapboxgl from 'mapbox-gl';
import * as MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

import { MapSelectorService } from '../map-selector.service';

@Component({
  selector: 'app-map-selector',
  templateUrl: './map-selector.component.html',
  styleUrls: ['./map-selector.component.less']
})
export class MapSelectorComponent implements OnInit {

  @ViewChild('mapEl', {static: true}) mapEl: ElementRef;
  
  theMap: mapboxgl.Map;

  constructor(private mapSvc: MapService, private mapSelector: MapSelectorService) { }

  ngOnInit(): void {
    this.theMap = new mapboxgl.Map({
      container: this.mapEl.nativeElement,
      style: MAPBOX_STYLE,
      minZoom: 3,
    });
    var geocoder = new MapboxGeocoder({ accessToken: mapboxgl.accessToken });
    this.theMap.addControl(geocoder);
    this.theMap.addControl(new mapboxgl.NavigationControl({visualizePitch: true}));
  }

  submit() {
    const center = this.theMap.getCenter();
    const geo = `center: { lon: ${center.lng}, lat: ${center.lat} },
    zoom: ${this.theMap.getZoom()},
    pitch: ${this.theMap.getPitch()},
    bearing: ${this.theMap.getBearing()}`;
    this.mapSelector.submitResult(geo);
  }

  cancel() {
    this.mapSelector.submitResult(null);
  }

}
