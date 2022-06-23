import { Component } from '@angular/core';

import { AIRTABLE_BASE } from '../../../../../CONFIGURATION';

import { marked } from 'marked';
import { first } from 'rxjs';
import { ApiService } from '../api.service';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { TimelineMapService } from '../timeline-map.service';
@Component({
  selector: 'app-spectours',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.less']
})
export class MainComponent {
  title: string | null = null;
  subtitle: string;
  infobarTitle: string;
  infobarSubtitle: string;
  timelineService: TimelineMapService;

  constructor(private api: ApiService, private titleSvc: Title) {
  }

  ngOnInit() {
    this.timelineService = new TimelineMapService(this.api, AIRTABLE_BASE);
    this.timelineService.ready.pipe(first()).subscribe(() => {
      this.title = this.timelineService.TITLE || '';
      this.titleSvc.setTitle(this.title);
      this.subtitle = this.timelineService.SUBTITLE || '';
      this.infobarTitle = this.timelineService.INFOBAR_TITLE || '';
      this.infobarSubtitle = this.timelineService.INFOBAR_SUBTITLE || '';
    });
    this.timelineService.fetchData().subscribe(() => { console.log('fetchData'); });
  }
}
