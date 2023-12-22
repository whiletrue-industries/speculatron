import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ReplaySubject, Subject, animationFrameScheduler, debounceTime, delay, distinctUntilChanged, filter, map, tap } from 'rxjs';

export class State {
  constructor(public timelineState: string, public selectedItemId: number | null, public replaceUrl: boolean | null = null) {
  }
}

@Injectable({
  providedIn: 'root'
})
export class StateService {

  internalStates = new Subject<State>();
  state = new ReplaySubject<State>(1);
  timelineState_: string;
  selectedItemId_: number | null;

  constructor(private router: Router) {
    this.internalStates.pipe(
      delay(0, animationFrameScheduler),
      distinctUntilChanged((a, b) => a.timelineState === b.timelineState && a.selectedItemId === b.selectedItemId),
      tap((state) => {
        this.state.next(state);
      }),
      filter((state: State) => state.replaceUrl !== null),
      map((state) => {
        let fragment = '';
        if (state.timelineState) {
          fragment += state.timelineState;
        }
        if (state.selectedItemId) {
          fragment += `//${state.selectedItemId}`;
        }
        if (state.replaceUrl === false) {
          this.router.navigate([], {
            fragment,
            replaceUrl: false
          });
        }
        if (state.replaceUrl === true) {
          return fragment;
        }
        return null
      }),
      debounceTime(250, animationFrameScheduler),
      tap((fragment) => {
        if (fragment) {
          this.router.navigate([], {
            fragment,
            replaceUrl: true,
          });
        }
      })
    ).subscribe();
  }

  initFromUrl(fragment: string, params: {[k: string]: string}) {
    const parts = fragment.split('//');
    let timelineState = '';
    let selectedItemId = null;
    if (parts.length > 0) {
      timelineState = parts[0];
      if (parts.length > 1) {
        try {
          selectedItemId = parseInt(parts[1], 10) || null;
        } catch (e) {
          selectedItemId = null;
        }
      }
    }
    this.timelineState_ = timelineState;
    this.selectedItemId_ = selectedItemId;
    this.internalStates.next(new State(timelineState, selectedItemId));
  }

  set timelineState(timelineState: string) {
    this.timelineState_ = timelineState;
    this.internalStates.next(new State(timelineState, this.selectedItemId_, true));
  }

  set selectedItemId(selectedItemId: number | null) {
    this.selectedItemId_ = selectedItemId;
    this.internalStates.next(new State(this.timelineState_, selectedItemId, false));
  }
}
