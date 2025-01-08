import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { MapSelectorService } from '../../map-selector.service';
import { ChronomapDatabase } from '../../data.service';
import { timer } from 'rxjs';
import { FlyToOptions } from '../../map-handler/map-utils';
import { MapHandler } from '../../map-handler/map-handler-base';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';

@UntilDestroy()
@Component({
    selector: 'app-map-selector',
    templateUrl: './map-selector.component.html',
    styleUrls: ['./map-selector.component.less'],
    standalone: false
})
export class MapSelectorComponent implements AfterViewInit, OnDestroy {

  @Input() chronomap: ChronomapDatabase;
  @Input() mapHandler: MapHandler<any, any>;
  @Input() position: FlyToOptions;

  @ViewChild('mapEl', {static: true}) mapEl: ElementRef;
  
  resizeObserver: ResizeObserver;

  constructor(private mapSelector: MapSelectorService, private el: ElementRef) { }

  ngAfterViewInit(): void {
    this.chronomap.ready.subscribe(() => {
      console.log('IIIII', this.mapEl.nativeElement, this.position);
      this.mapHandler.initSelectorMap(this.mapEl.nativeElement, this.position, true);
      this.mapHandler.selectorMapMoved.pipe(
        untilDestroyed(this)
      ).subscribe((d: {geo: string, position: FlyToOptions}) => {
        let props: any = {
          geo: d.geo,
        };
        const geoJson = this.chronomap.HotSpotsGeoJson();
        console.log('GEOJSON', geoJson);
        console.log('CENTER', d.position.center);
        if (d.position.center && geoJson) {
          const pt = point([d.position.center.lon, d.position.center.lat]);
          // Use TURF.js to load the geoJson object, and find features that contain the point:
          const features = geoJson.features.filter((feature: any) => {
            return booleanPointInPolygon(pt, polygon(feature.geometry.coordinates));
          });
          Object.assign(props, ...features.map((feature: any) => feature.properties));
        }
        console.log('SELECTED MAP', props);
        this.mapSelector.submitMapResult(props);
      });
    });
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      timer(0).subscribe(() => {
        this.mapHandler.resize();
      });
    });
    this.resizeObserver.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.mapHandler.clearSelectorMap();
  }
}
