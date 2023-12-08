import { Component, Input, OnInit } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { PRIMARY_COLOR } from 'CONFIGURATION';
import { timer } from 'rxjs';
import { TimelineMapService } from '../timeline-map.service';

@Component({
  selector: 'app-timeline-map-base',
  templateUrl: './timeline-map-base.component.html',
  styleUrls: ['./timeline-map-base.component.less']
})
export class TimelineMapBaseComponent implements OnInit {

  @Input() id: string;
  @Input() title: SafeHtml;
  @Input() subtitle: SafeHtml;
  @Input() infobarTitle: string;
  @Input() infobarSubtitle: string;
  @Input() api: TimelineMapService;

  _info = false;
  _addNew = false;
  _layers = false;
  addNewOpen = false;
  layersOpen = false;

  PRIMARY_COLOR = PRIMARY_COLOR;

  constructor() { }

  ngOnInit(): void {
    this._info = localStorage.getItem(this.id) !== 'opened';
  }
    
  get info() { return this._info; }
  set info(value) {
    console.log('INFO=', value);
    this._addNew = false;
    this._layers = false;
    this._info = value;
    localStorage.setItem(this.id, 'opened');
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
}
