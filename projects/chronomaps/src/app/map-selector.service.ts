import { Injectable } from '@angular/core';
import { CameraOptions } from 'mapbox-gl';
import { Subject } from 'rxjs';
import { DataService } from './data.service';
import { FlyToOptions, MapUtils } from './map-handler/map-utils';

@Injectable({
  providedIn: 'root'
})
export class MapSelectorService {

  public showMapSelector = false;
  public showTimelineSelector = false;
  public selectedGeo: FlyToOptions = {};
  public selectedDate = '';
  public mapResults = new Subject<{[key: string]: any}>();
  public timelineResults = new Subject<string | null>();

  constructor() {}

  submitMapResult(value: {[key: string]: any}) {
    if (value['geo']) {
      this.selectedGeo = MapUtils.parseMapView(value['geo']);
    }
    this.mapResults.next(value);
  }

  submitTimelineResult(value: string, nice: string) {
    this.timelineResults.next(value);
    this.selectedDate = nice;
  }
}
