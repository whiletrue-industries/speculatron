import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AIRTABLE_DETAILS_FORM } from 'CONFIGURATION';
import { marked } from 'marked';
import { first, tap } from 'rxjs';
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
  
  marked = marked;
  contributeMessage: any = '';
  slide = 0;
  contentType = '';
  selectedDate: string;
  selectedGeo: string;
  iframeURL: string;
  iframeSafeURL: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer, public mapSelector: MapSelectorService) { }

  ngOnInit(): void {
    this.api.ready.pipe(first()).subscribe(() => {
      this.contributeMessage = this.sanitizer.bypassSecurityTrustHtml(marked(this.api.CONTRIBUTE_MESSAGE))
    });
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
        `prefill_geo=${geo}&hide_geo=true`;
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
}


