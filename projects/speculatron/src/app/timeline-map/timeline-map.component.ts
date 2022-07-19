import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MAPBOX_STYLE } from '../../../../../CONFIGURATION';
import * as mapboxgl from 'mapbox-gl';
import { forkJoin, ReplaySubject, timer } from 'rxjs';
import { switchMap, first, delay } from 'rxjs/operators';
import { MapService } from '../map.service';
import { TimelineMapService } from '../timeline-map.service';

@Component({
  selector: 'app-timeline-map',
  templateUrl: './timeline-map.component.html',
  styleUrls: ['./timeline-map.component.less']
})
export class TimelineMapComponent implements OnInit {

  @Input() id: string;
  @Input() title: SafeHtml;
  @Input() subtitle: SafeHtml;
  @Input() infobarTitle: string;
  @Input() infobarSubtitle: string;
  @Input() api: TimelineMapService;

  timeline: any[] = [];
  mapViews = new ReplaySubject<any>(1);
  theMap: mapboxgl.Map;
  @ViewChild('mapEl', {static: true}) mapEl: ElementRef;
  _info = false;
  _addNew = false;
  _layers = false;
  addNewOpen = false;
  layersOpen = false;

  activeYear = -1;

  constructor(private activatedRoute: ActivatedRoute, private mapSvc: MapService) {
  }

  get info() { return this._info; }
  set info(value) {
    console.log('INFO=', value);
    this._addNew = false;
    this._layers = false;
    this._info = value;
    localStorage.setItem(this.id, 'opened');
  }

  get addNew() { return this._addNew; }
  set addNew(value) {
    this._info = false;
    this._layers = false;
    this._addNew = value;
    timer(0).subscribe(() => {this.addNewOpen = value;});
  }

  get layers() { return this._layers; }
  set layers(value) {
    this._info = false;
    this._addNew = false;
    this._layers = value;
    timer(0).subscribe(() => {this.layersOpen = value;});
  }

  ngOnInit(): void {
    this._info = localStorage.getItem(this.id) !== 'opened';
    this.api.data.subscribe((timeline: any) => {
      if (!this.timeline) {
        this.activatedRoute.fragment.pipe(
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
      }
      this.timeline = timeline;
    });
    this.theMap = new mapboxgl.Map({
      container: this.mapEl.nativeElement,
      style: MAPBOX_STYLE,
      minZoom: 3,
    });
    this.theMap.on('style.load', () => {
      this.api.fetchMapData().subscribe((views) => {
        this.api.data.subscribe((timeline) => {
          timeline.forEach((item) => {
            if (item.hasContent && !item.map_view && !views[item.title]) {
              if (item.map_view && item.map_view.length > 0) {
                return;
              }
              item.map_view = [item.title];
              views[item.title] = item;
            }
          });
        });
        this.mapViews.next(views);
      });  
    })
  }

  changeMapView(mapViewName: string) {
    this.mapViews.pipe(first()).subscribe((mapViews) => {
      const mapView: any = mapViews[mapViewName];
      const options = this.mapSvc.parseMapView(mapView);
      for (const l of mapView.onLayers || []) {
        if (this.theMap.getLayer(l)) {
          this.theMap.setLayoutProperty(l, 'visibility', 'visible');
        }
      }
      for (const l of mapView.offLayers || []) {
        if (this.theMap.getLayer(l)) {
          this.theMap.setLayoutProperty(l, 'visibility', 'none');
        }
      }
      this.theMap.flyTo(options);
    });
  }
}
