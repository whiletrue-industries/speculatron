import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, effect, signal } from '@angular/core';

import * as mapboxgl from 'mapbox-gl';
import * as MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

import { MapSelectorService } from '../../map-selector.service';
import { ChronomapDatabase } from '../../data.service';

@Component({
  selector: 'app-timeline-selector',
  templateUrl: './timeline-selector.component.html',
  styleUrls: ['./timeline-selector.component.less']
})
export class TimelineSelectorComponent implements AfterViewInit, OnInit {

  @Input() chronomap: ChronomapDatabase;
  @Input() flyToOptions: mapboxgl.FlyToOptions;

  @ViewChild('mapEl', {static: true}) mapEl: ElementRef;

  minDate: Date;
  maxDate: Date;

  date = signal<Date>(new Date());
  includeTime = signal<boolean>(false);
  
  theMap: mapboxgl.Map;

  constructor(public mapSelector: MapSelectorService) {
    effect(() => {
      console.log('SELECTED DATE', this.date().toISOString());
      if (this.includeTime()) {
        const date = this.date();
        date.setSeconds(0);
        date.setMilliseconds(0);
        const timestamp = this.date().toISOString();
        let nice = this.date().toLocaleString();
        // remove seconds, last 3 chars
        nice = nice.substring(0, nice.length - 3);
        this.mapSelector.submitTimelineResult(timestamp, nice);
      } else {
        const timestamp = this.date().toISOString().split('T')[0];
        const nice = this.date().toLocaleDateString();
        this.mapSelector.submitTimelineResult(timestamp, nice);
      }
    });
  }

  ngOnInit(): void {
      const minDate = this.chronomap.minDate();
      const maxDate = this.chronomap.maxDate();
      const delta = (maxDate.getTime() - minDate.getTime()) + 1000 * 60 * 60 * 24;
      this.minDate = new Date(minDate.getTime() - delta);
      this.maxDate = new Date(maxDate.getTime() + delta);

  }

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
        interactive: false,
      });
      var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        marker: false,
      });
    });
  }
}
