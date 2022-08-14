import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AIRTABLE_BASE, AIRTABLE_DETAILS_FORM, PRIMARY_COLOR } from 'CONFIGURATION';
import { marked } from 'marked';
import { first, interval, Subscription, switchMap, tap } from 'rxjs';
import { ApiService } from '../api.service';
import { MapSelectorService } from '../map-selector.service';
import { TimelineMapService } from '../timeline-map.service';

@Component({
  selector: 'app-add-new-bar',
  templateUrl: './add-new-bar.component.html',
  styleUrls: ['./add-new-bar.component.less']
})
export class AddNewBarComponent implements OnInit {
  
  @Input() api: TimelineMapService;
  @Output() close = new EventEmitter();
  
  PRIMARY_COLOR = PRIMARY_COLOR;

  marked = marked;
  contributeMessage: any = '';
  slide = 0;
  contentType = '';
  selectedDate: string;
  selectedGeo: string;
  iframeURL: string | null = null;
  iframeSafeURL: SafeResourceUrl;
  nonce: string;
  subscription: Subscription | null = null;

  constructor(private sanitizer: DomSanitizer, public mapSelector: MapSelectorService, private airtable: ApiService) { }

  ngOnInit(): void {
    this.api.ready.pipe(first()).subscribe(() => {
      this.contributeMessage = this.sanitizer.bypassSecurityTrustHtml(marked(this.api.CONTRIBUTE_MESSAGE))
    });
    this.nonce = '' + (Math.floor(Math.random() * 1000000000));
  }

  selectCT(ct: string) {
    this.contentType = ct;
    this.slide += 1;
  }

  get iframeSrc() {
    if (!this.selectedDate) return null;
    if (!this.contentType) return null;
    if (!this.selectedGeo) return null;
    const geo = encodeURIComponent(this.selectedGeo);
    const url = `${AIRTABLE_DETAILS_FORM}?` +
        `prefill_type=${this.contentType}&hide_type=true&` + 
        `prefill_post_timestamp=${this.selectedDate}T00:00:00.000&hide_post_timestamp=true&` + 
        `prefill_geo=${geo}&hide_geo=true&` +
        `prefill_nonce=${this.nonce}&hide_nonce=true`;
    if (!this.iframeURL) {
      this.initPolling();
    }
    if (this.iframeURL !== url) {
      this.iframeURL = url;
      this.iframeSafeURL = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return this.iframeSafeURL;
  }

  openMap() {
    this.mapSelector.showMapSelector = true;
    this.mapSelector.results.pipe(first()).subscribe((value) => {
      console.log('GOT GEO', value);
      if (value) {
        this.selectedGeo = value;
      }
    });
  }

  closeMe() {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.close.emit();
  }

  initPolling() {
    this.subscription = interval(5000).pipe(
      switchMap(() => this.airtable.airtableFetch(AIRTABLE_BASE, this.airtable.CONTENT_TABLE, 'incoming')),
      this.airtable.airtableToArray(),
    ).subscribe((records) => {
      records.forEach((record: any) => {
        if (record.nonce === this.nonce) {
          this.subscription?.unsubscribe();
          this.subscription = null;
          this.slide = 5;
        }
      });
    });
  }
}


