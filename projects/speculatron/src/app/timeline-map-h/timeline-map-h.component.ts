import { Component, Input, OnInit } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MapService } from '../map.service';
import { TimelineMapService } from '../timeline-map.service';
import { BaseTimelineMapComponent } from '../timeline-map/base-timeline';

@Component({
  selector: 'app-timeline-map-h',
  templateUrl: './timeline-map-h.component.html',
  styleUrls: ['./timeline-map-h.component.less']
})
export class TimelineMapHComponent extends BaseTimelineMapComponent implements OnInit {

  @Input() id: string;
  @Input() title: SafeHtml;
  @Input() subtitle: SafeHtml;
  @Input() infobarTitle: string;
  @Input() infobarSubtitle: string;
  @Input() api: TimelineMapService;

  constructor(activatedRoute: ActivatedRoute, mapSvc: MapService) {
    super(activatedRoute, mapSvc);
  }

  ngOnInit(): void {
  }

}
