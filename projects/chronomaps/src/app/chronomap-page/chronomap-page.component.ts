import { Component, OnInit, effect, signal } from '@angular/core';
import { ChronomapDatabase, DataService } from '../data.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, first, map, timer } from 'rxjs';
import { MapService } from '../map.service';
import { StateService } from '../state.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { marked } from 'marked';

@UntilDestroy()
@Component({
  selector: 'app-chronomap-page',
  templateUrl: './chronomap-page.component.html',
  styleUrls: ['./chronomap-page.component.less']
})
export class ChronomapPageComponent {

  // @Input() hideHeader = false;
  LOCAL_STORAGE_KEY = 'chronomap-info-';

  slug: string | null = null;
  chronomap = signal<ChronomapDatabase | null>(null);

  _info = false;
  _addNew = false;
  _sortFilter = false;
  addNewOpen = false;
  sortFilterOpen = false;
  mobileMenu = false;

  marked = marked;

  constructor(private data: DataService, private route: ActivatedRoute, private mapSvc: MapService, private router: Router, private state: StateService) {
    this.route.params.pipe(
      first()
    ).subscribe(params => {
      this.slug = params['slug'];
      this.loadChronomap(this.data.directory.chronomaps(), this.slug);
      this._info = localStorage.getItem(this.storageKey) !== 'opened';
    });
    effect(() => {
      const chronomaps = this.data.directory.chronomaps();
      this.loadChronomap(chronomaps, this.slug);
    }, {allowSignalWrites: true});
    this.router.events.pipe(
      untilDestroyed(this),
      filter((event) => event instanceof NavigationEnd),
      map((event) => {
        const ne = event as NavigationEnd;
        const url = new URL('http://example.com' + ne.url);
        const params = Object.fromEntries(url.searchParams);
        const fragment = url.hash.slice(1);
        return {
          fragment,
          params,
        };
      })
    ).subscribe(({fragment, params}) => {
      this.state.initFromUrl(fragment, params);
    });
  }

  loadChronomap(chronomaps: ChronomapDatabase[], slug: string | null) {
    if (slug && chronomaps.length > 0) {
      const chronomap = chronomaps.find(c => c.slug() === slug);
      if (chronomap) {
        this.chronomap.set(chronomap);
      }
    }
  }
    
  get info() { return this._info; }
  set info(value) {
    console.log('INFO=', value);
    this._addNew = false;
    this._sortFilter = false;
    this._info = value;
    localStorage.setItem(this.storageKey, 'opened');
  }

  get addNew() { return this._addNew; }
  set addNew(value) {
    this._info = false;
    this._sortFilter = false;
    this._addNew = value;
    timer(0).subscribe(() => {this.addNewOpen = value;});
  }

  get sortFilter() { return this._sortFilter; }
  set sortFilter(value) {
    this._info = false;
    this._addNew = false;
    this._sortFilter = value;
    timer(0).subscribe(() => {this._sortFilter = value;});
  }

  get chronomap_(): ChronomapDatabase {
    const chronomap = this.chronomap();
    if (chronomap) {
      return chronomap;
    }
    return {} as ChronomapDatabase;
  }

  get storageKey() {
    return this.LOCAL_STORAGE_KEY + this.slug;
  }
}
