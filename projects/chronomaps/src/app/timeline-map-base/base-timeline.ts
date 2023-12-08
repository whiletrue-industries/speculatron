import { ActivatedRoute, ActivatedRouteSnapshot } from "@angular/router";
import { ReplaySubject, timer } from "rxjs";
import { MapService } from "../map.service";
import { TimelineMapService } from "../timeline-map.service";

import { delay, first } from "rxjs";
import * as mapboxgl from "mapbox-gl";

export class BaseTimelineMapComponent {
    
    timeline: any[] = [];
    mapViews = new ReplaySubject<any>(1);
    private _api: TimelineMapService;
  
    constructor(protected activatedRoute: ActivatedRoute) {
    }

    initialize(api: TimelineMapService) {
        this._api = api;
        api.data.subscribe((timeline: any) => {
            if (!this.timeline.length) {
              this.activatedRoute.fragment.pipe(
                first(),
                delay(1000),
              ).subscribe((fragment) => {
                if (fragment) {
                    this.goto(fragment);
                }
              });
              if (!this.activatedRoute.snapshot.fragment) {
                this.goto('');
              }
            }
            this.setTimeline(timeline);
          });
    }

    loadMapViews() {
        this._api.fetchMapData().subscribe((views) => {
            this._api.data.subscribe((timeline) => {
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
    }

    parseMapView(view: any): mapboxgl.FlyToOptions {
      if (!view.geo) {
        return {};
      }
      const geoRe = /center:\s*\{\s*lon:\s*([-0-9.]+),\s*lat:\s*([-0-9.]+)\s*\},\s*zoom:\s*([-0-9.]+),\s*pitch:\s*([-0-9.]+),\s*bearing:\s*([-0-9.]+)/g;
      const parsed = geoRe.exec(view.geo);
      if (parsed !== null) {
        const options: mapboxgl.FlyToOptions = {
          center: {
            lon: parseFloat(parsed[1]),
            lat: parseFloat(parsed[2]),
          },
          zoom: parseFloat(parsed[3]),
          pitch: parseFloat(parsed[4]),
          bearing: parseFloat(parsed[5])
        }
        if (view.curve) {
          options.curve = view.curve;
        }
        if (view.speed) {
          options.speed = view.speed;
        }
        return options;
      } else {
        return {};
      }
    }
  
    applyMapView(view: string, map: mapboxgl.Map, extraOptions: any = null) {
      this.mapViews.pipe(first()).subscribe((mapViews) => {
        const mapView: any = mapViews[view];
        const options = Object.assign({}, this.parseMapView(mapView), extraOptions || {});
        for (const l of mapView.onLayers || []) {
          if (map.getLayer(l)) {
            map.setLayoutProperty(l, 'visibility', 'visible');
          }
        }
        for (const l of mapView.offLayers || []) {
          if (map.getLayer(l)) {
            map.setLayoutProperty(l, 'visibility', 'none');
          }
        }
        map.flyTo(options);
      });
    }

    goto(location: string) {}

    updateLocation(fragment: string) {
      location.replace(location.pathname + '#' + fragment);
    }

    setTimeline(timeline: any[]) {
      this.timeline = timeline;
    }
}