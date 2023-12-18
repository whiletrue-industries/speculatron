import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { first } from 'rxjs/operators';
import { ChronomapDatabase } from '../../data.service';

@Component({
  selector: 'app-infobar',
  templateUrl: './infobar.component.html',
  styleUrls: ['./infobar.component.less']
})
export class InfobarComponent {

  @Input() chronomap: ChronomapDatabase;
  @Output() close = new EventEmitter();
  
  marked = marked;
  aboutContent_: SafeHtml | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  get aboutContent() {
    if (!this.aboutContent_) {
      if (this.chronomap.infobarContent()) {
        this.aboutContent_ = this.sanitizer.bypassSecurityTrustHtml(marked(this.chronomap.infobarContent()));
      } else {
        return this.sanitizer.bypassSecurityTrustHtml('Loading...');
      }
    }
    return this.aboutContent_;
  }
}
