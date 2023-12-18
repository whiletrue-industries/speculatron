import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AIRTABLE_BASE, AIRTABLE_DETAILS_FORM } from 'CONFIGURATION';
import { marked } from 'marked';
import { first, interval, Subscription, switchMap, tap } from 'rxjs';
import { MapSelectorService } from '../../map-selector.service';
import { ChronomapDatabase, DataService, TimelineItem } from '../../data.service';

@Component({
  selector: 'app-add-new-bar',
  templateUrl: './add-new-bar.component.html',
  styleUrls: ['./add-new-bar.component.less']
})
export class AddNewBarComponent implements OnInit {
  
  @Input() chronomap: ChronomapDatabase;

  @Output() close = new EventEmitter();
  
  marked = marked;
  contributeMessage: any = '';
  slide = 0;
  contentType = '';
  selectedDate: string;
  selectedGeo: string;
  iframeURL: string | null = null;
  iframeSafeURL: SafeResourceUrl | null;
  nonce: string;
  subscription: Subscription | null = null;

  constructor(private sanitizer: DomSanitizer, public mapSelector: MapSelectorService, private data: DataService) { }

  ngOnInit(): void {
    this.chronomap.ready.pipe(first()).subscribe(() => {
      this.contributeMessage = this.sanitizer.bypassSecurityTrustHtml(marked(this.chronomap.contributeMessage()))
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
    if (!this.chronomap.newEntryForm()) return null;
    const url = new URL(this.chronomap.newEntryForm());
    url.searchParams.append('prefill_Media Type', this.contentType);
    url.searchParams.append('hide_Media_Type', 'true');
    url.searchParams.append('prefill_Post_Timestamp', this.selectedDate + 'T00:00:00.000');
    url.searchParams.append('hide_Post_Timestamp', 'true');
    url.searchParams.append('prefill_Geo', this.selectedGeo);
    url.searchParams.append('hide_Geo', 'true');
    url.searchParams.append('prefill_Nonce', this.nonce);
    url.searchParams.append('hide_Nonce', 'true');
    url.searchParams.append('prefill_Status', 'Review');
    url.searchParams.append('hide_Status', 'true');
    if (!this.iframeURL) {
      this.initPolling();
    }
    const urlStr = url.toString();
    if (this.iframeURL !== urlStr) {
      this.iframeURL = urlStr;
      this.iframeSafeURL = this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeURL);
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
      switchMap(() => this.chronomap.fetch())
    ).subscribe((records) => {
      this.chronomap.nonces.forEach((nonce: string) => {
        if (nonce === this.nonce) {
          this.subscription?.unsubscribe();
          this.subscription = null;
          this.slide = 4;
        }
      });
    });
  }
}


