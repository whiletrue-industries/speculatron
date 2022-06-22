import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as mapboxgl from 'mapbox-gl';
import { ReplaySubject } from 'rxjs';
import { switchMap, first, delay } from 'rxjs/operators';
import { MapService } from '../map.service';
import { ApiService } from '../api.service';
import { TimelineMapService } from '../timeline-map.service';

@Component({
  selector: 'app-timeline-map',
  templateUrl: './timeline-map.component.html',
  styleUrls: ['./timeline-map.component.less']
})
export class TimelineMapComponent implements OnInit {

  @Input() id: string;
  @Input() airtableBase: string;
  @Input() title: string;
  @Input() subtitle: string;
  @Input() infobarTitle: string;
  @Input() infobarSubtitle: string;
  @Input() mapStyle: string;
  api: TimelineMapService;

  timeline: any[] = [];
  mapViews = new ReplaySubject<any>(1);
  theMap: mapboxgl.Map;
  @ViewChild('mapEl', {static: true}) mapEl: ElementRef;
  _info = false;
  activeYear = -1;

  constructor(private activatedRoute: ActivatedRoute, private apiSvc: ApiService, private mapSvc: MapService) {
  }

  get info() { return this._info; }
  set info(value) {
    this._info = value;
    localStorage.setItem(this.id, 'opened');
  }

  ngOnInit(): void {
    this._info = localStorage.getItem(this.id) !== 'opened';
    this.api = new TimelineMapService(this.apiSvc, this.airtableBase);
    this.api.fetchData().pipe(
      switchMap((timeline: any) => {
        this.timeline = timeline;
        return this.activatedRoute.fragment;
      }),
      first(),
      delay(1000),
    ).subscribe((fragment) => {
      this.activeYear = this.api.YEAR_CURRENT;
      if (fragment ) {
        this.activeYear = parseInt(fragment.slice(1));
        if (!this.activeYear) {
          this.activeYear = this.api.YEAR_CURRENT;
        }
      }
      fragment = 'Y' + this.activeYear;
      const el = document.querySelector(`[data-year=${fragment}]`);
      if (el) {
        el.scrollIntoView({block: 'center', behavior: 'auto'});
      }
    });
    this.theMap = new mapboxgl.Map({
      container: this.mapEl.nativeElement,
      style: this.mapStyle,
      minZoom: 3,
    });
    this.theMap.on('style.load', () => {
      this.api.fetchMapData().subscribe((views) => {
        this.mapViews.next(views);
      });  
    })
  }

  changeMapView(mapViewName: string) {
    this.mapViews.pipe(first()).subscribe((mapViews) => {
      const mapView: any = mapViews[mapViewName];
      const options = this.mapSvc.parseMapView(mapView);
      for (const l of mapView.onLayers) {
        if (this.theMap.getLayer(l)) {
          this.theMap.setLayoutProperty(l, 'visibility', 'visible');
        }
      }
      for (const l of mapView.offLayers) {
        if (this.theMap.getLayer(l)) {
          this.theMap.setLayoutProperty(l, 'visibility', 'none');
        }
      }
      this.theMap.flyTo(options);
    });
  }
}
