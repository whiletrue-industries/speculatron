import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { MapSelectorService } from '../../map-selector.service';
import { ChronomapDatabase } from '../../data.service';
import { timer } from 'rxjs';
import { FlyToOptions } from '../../map-handler/map-utils';
import { MapHandler } from '../../map-handler/map-handler-base';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';


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
      this.mapHandler.initSelectorMap(this.mapEl.nativeElement, this.position, true);
      this.mapHandler.selectorMapMoved.pipe(
        untilDestroyed(this)
      ).subscribe((geo: string) => {
        this.mapSelector.submitMapResult(geo);
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
