import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapSelectorService {

  public showMapSelector = false;
  public results = new Subject<string | null>();

  constructor() {}

  submitResult(value: string | null) {
    this.showMapSelector = false;
    console.log('SUBMITTING RESULT', value);
    this.results.next(value);
  }
}
