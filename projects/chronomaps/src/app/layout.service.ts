import { Inject, Injectable, signal } from '@angular/core';
import { fromEvent } from 'rxjs';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  mobile = signal(false);
  desktop = signal(false);

  constructor(@Inject(DOCUMENT) private document: Document) {
    if (this.window) {
      fromEvent(this.window, 'resize').subscribe(() => {
        this._check();
      });  
    }
    this._check();
  }

  get window() {
    return this.document.defaultView;
  }

  private _check() {
    if (this.window?.innerWidth) {
      this.mobile.set(this.window.innerWidth < 1000);
      this.desktop.set(!this.mobile());
    } else {
      this.mobile.set(false);
      this.desktop.set(true);
    }
  }

}
