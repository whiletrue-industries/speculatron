import { Component, OnInit, effect, signal } from '@angular/core';
import { ChronomapDatabase, DataService } from '../data.service';
import { ActivatedRoute } from '@angular/router';
import { first, timer } from 'rxjs';

@Component({
  selector: 'app-chronomap-page',
  templateUrl: './chronomap-page.component.html',
  styleUrls: ['./chronomap-page.component.less']
})
export class ChronomapPageComponent implements OnInit {

  // @Input() hideHeader = false;

  LOCAL_STORAGE_KEY = 'chronomap-info';
  slug: string | null = null;
  chronomap = signal<ChronomapDatabase | null>(null);

  _info = false;
  _addNew = false;
  _layers = false;
  addNewOpen = false;
  layersOpen = false;


  constructor(private data: DataService, private route: ActivatedRoute) {
    this.route.params.pipe(
      first()
    ).subscribe(params => {
      this.slug = params['slug'];
      this.loadChronomap(this.data.directory.chronomaps(), this.slug);
    });
    effect(() => {
      const chronomaps = this.data.directory.chronomaps();
      this.loadChronomap(chronomaps, this.slug);
    }, {allowSignalWrites: true});

  }

  ngOnInit(): void {
    this._info = localStorage.getItem(this.LOCAL_STORAGE_KEY) !== 'opened';
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
    this._layers = false;
    this._info = value;
    localStorage.setItem(this.LOCAL_STORAGE_KEY, 'opened');
  }

  get addNew() { return this._addNew; }
  set addNew(value) {
    this._info = false;
    this._layers = false;
    this._addNew = value;
    timer(0).subscribe(() => {this.addNewOpen = value;});
  }

  get layers() { return this._layers; }
  set layers(value) {
    this._info = false;
    this._addNew = false;
    this._layers = value;
    timer(0).subscribe(() => {this.layersOpen = value;});
  }

  get chronomap_(): ChronomapDatabase {
    const chronomap = this.chronomap();
    if (chronomap) {
      return chronomap;
    }
    return {} as ChronomapDatabase;
  }
}
