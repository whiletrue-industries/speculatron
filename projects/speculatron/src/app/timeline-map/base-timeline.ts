import { ActivatedRoute } from "@angular/router";
import { timer } from "rxjs";
import { MapService } from "../map.service";
import { TimelineMapService } from "../timeline-map.service";

import { delay } from "rxjs";

export class BaseTimelineMapComponent {

    _info = false;
    _addNew = false;
    _layers = false;
    _id: string;
    _api: TimelineMapService;
    
    addNewOpen = false;
    layersOpen = false;

    timeline: any[] = [];
  
    constructor(protected activatedRoute: ActivatedRoute, protected mapSvc: MapService) {
    }
  
    get info() { return this._info; }
    set info(value) {
      console.log('INFO=', value);
      this._addNew = false;
      this._layers = false;
      this._info = value;
      localStorage.setItem(this._id, 'opened');
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

    initialize(id: string, api: TimelineMapService) {
        this._id = id;
        this._api = api;
        this._info = localStorage.getItem(this._id) !== 'opened';
        this._api.data.subscribe((timeline: any) => {
            if (!this.timeline) {
              this.activatedRoute.fragment.pipe(
                delay(1000),
              ).subscribe((fragment) => {
                if (fragment) {
                    this.goto(fragment);
                }
              });
            }
            this.timeline = timeline;
          });
    }

    goto(location: string) {}
}