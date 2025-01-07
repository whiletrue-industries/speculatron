import { Injectable } from '@angular/core';
import { FlyToOptions } from 'mapbox-gl';
import { Subject } from 'rxjs';
import { DataService } from './data.service';
import { MapUtils } from './map-handler/map-utils';

@Injectable({
  providedIn: 'root'
})
export class MapSelectorService {

  public showMapSelector = false;
  public showTimelineSelector = false;
  public selectedGeo: FlyToOptions = {};
  public selectedDate = '';
  public mapResults = new Subject<string | null>();
  public timelineResults = new Subject<string | null>();

  constructor() {}

  submitMapResult(value: string | null) {
    if (value) {
      this.selectedGeo = MapUtils.parseMapView(value);
    }
    this.mapResults.next(value);
  }

  submitTimelineResult(value: string, nice: string) {
    this.timelineResults.next(value);
    this.selectedDate = nice;
  }
}
