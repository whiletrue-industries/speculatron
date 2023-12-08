import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { marked } from 'marked';
import { DomSanitizer } from '@angular/platform-browser';
import { first } from 'rxjs/operators';
import { TimelineMapService } from '../timeline-map.service';
import { PRIMARY_COLOR } from 'CONFIGURATION';

@Component({
  selector: 'app-infobar',
  templateUrl: './infobar.component.html',
  styleUrls: ['./infobar.component.less']
})
export class InfobarComponent implements OnInit {

  @Input() title: string;
  @Input() subtitle: string;
  @Input() api: TimelineMapService;
  @Output() close = new EventEmitter();
  
  PRIMARY_COLOR = PRIMARY_COLOR;

  marked = marked;
  aboutContent: any = '';

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.api.ready.pipe(first()).subscribe(() => {
      this.aboutContent = this.sanitizer.bypassSecurityTrustHtml(marked(this.api.ABOUT))
    });
  }
}
