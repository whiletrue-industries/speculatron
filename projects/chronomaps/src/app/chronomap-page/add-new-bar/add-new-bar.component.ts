import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { marked } from 'marked';
import { first, interval, Subscription, switchMap } from 'rxjs';
import { MapSelectorService } from '../../map-selector.service';
import { ChronomapDatabase, DataService } from '../../data.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-add-new-bar',
  templateUrl: './add-new-bar.component.html',
  styleUrls: ['./add-new-bar.component.less'],
  host: {
    '[style.border-color]': 'chronomap.primaryColor() + "40"',
  }
})
export class AddNewBarComponent implements OnInit {
  
  @Input() chronomap: ChronomapDatabase;

  @Output() close = new EventEmitter();
  
  marked = marked;
  contributeMessage: any = '';
  slide_ = 0;
  contentType = '';
  selectedDate: string;
  selectedGeo: string;
  mapSubscription: Subscription | null = null;

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
    url.searchParams.append('hide_Media Type', 'true');
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
    this.mapSubscription?.unsubscribe();
    this.mapSubscription = this.mapSelector.mapResults.pipe(
      untilDestroyed(this)
    ).subscribe((value) => {
      console.log('GOT GEO', value);
      if (value) {
        this.selectedGeo = value;
      }
    });
  }

  closeMap() {
    this.mapSelector.showMapSelector = false;
    this.mapSubscription?.unsubscribe();
    this.mapSubscription = null;
  }

  openTimeline() {
    this.mapSelector.showTimelineSelector = true;
    this.mapSubscription?.unsubscribe();
    this.mapSubscription = this.mapSelector.timelineResults.pipe(
      untilDestroyed(this)
    ).subscribe((value) => {
      console.log('GOT DATE', value);
      if (value) {
        this.selectedDate = value;
      }
    });
  }

  closeTimeline() {
    this.mapSelector.showTimelineSelector = false;
    this.mapSubscription?.unsubscribe();
    this.mapSubscription = null;
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

  set slide(value: number) {
    this.slide_ = value;
    if (this.slide_ === 1) {
      this.openMap();
    }
    if (this.slide_ === 2) {
      this.closeMap();
      this.openTimeline();
    }
    if (this.slide_ === 3) {
      this.closeTimeline();
    }
  }

  get slide() {
    return this.slide_;
  }
}


