import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AIRTABLE_BASE, AIRTABLE_DETAILS_FORM, PRIMARY_COLOR } from 'CONFIGURATION';
import { marked } from 'marked';
import { first, interval, Subscription, switchMap, tap } from 'rxjs';
import { ApiService } from '../api.service';
import { MapSelectorService } from '../map-selector.service';
import { TimelineMapService } from '../timeline-map.service';

@Component({
  selector: 'app-layers-bar',
  templateUrl: './layers-bar.component.html',
  styleUrls: ['./layers-bar.component.less']
})
export class LayersBarComponent implements OnInit {
  
  @Input() api: TimelineMapService;
  @Output() close = new EventEmitter();
  @Output() addNew = new EventEmitter();
  
  PRIMARY_COLOR = PRIMARY_COLOR;

  constructor() { }

  ngOnInit(): void {
  }

  closeMe() {
    this.close.emit();
  }
}


