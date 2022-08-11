import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { MAPBOX_STYLE } from '../../../../../CONFIGURATION';
import * as mapboxgl from 'mapbox-gl';
import { forkJoin, ReplaySubject, timer } from 'rxjs';
import { switchMap, first, delay } from 'rxjs/operators';
import { MapService } from '../map.service';
import { TimelineMapService } from '../timeline-map.service';
import { BaseTimelineMapComponent } from '../timeline-map-base/base-timeline';

@Component({
  selector: 'app-timeline-map',
  templateUrl: './timeline-map.component.html',
  styleUrls: ['./timeline-map.component.less']
})
export class TimelineMapComponent extends BaseTimelineMapComponent implements OnInit {

  @Input() id: string;
  @Input() title: SafeHtml;
  @Input() subtitle: SafeHtml;
  @Input() infobarTitle: string;
  @Input() infobarSubtitle: string;
  @Input() api: TimelineMapService;

  theMap: mapboxgl.Map;
  @ViewChild('mapEl', {static: true}) mapEl: ElementRef;

  activeYear = -1;
  activeItem: any;

  constructor(activatedRoute: ActivatedRoute, private mapSvc: MapService) {
    super(activatedRoute);
  }

  ngOnInit(): void {
    this.initialize(this.api);
    this.theMap = new mapboxgl.Map({
      container: this.mapEl.nativeElement,
      style: MAPBOX_STYLE,
      minZoom: 3,
    });
    this.theMap.on('style.load', () => {
      this.loadMapViews();
    })
  }

  override goto(fragment: string) {
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
  }

  changeMapView(mapViewName: string) {
    this.applyMapView(mapViewName, this.theMap);
  }

  contentActivated(item: any) {
    this.activeItem = item;
    this.updateLocation('Y' + item.year);
  }
}
