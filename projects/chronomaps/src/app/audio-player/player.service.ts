import { Injectable } from '@angular/core';

import { BehaviorSubject, fromEvent, ReplaySubject, Subscription } from 'rxjs';
import { first, subscribeOn } from 'rxjs/operators';
import { Player } from './player';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  current: Player | null = null;
  clock = new ReplaySubject<string>(1);
  clockSub: Subscription | null = null;
  playingSub: Subscription | null = null;
  isPlaying = new BehaviorSubject<boolean>(false);
  last: Player | null = null;

  constructor() {
    fromEvent(window, 'keyup').subscribe((ev_: Event) => {
      const ev = ev_ as KeyboardEvent;
      if (ev.code === 'Space') {
        if (this.current !== null) {
          this.current.toggle();
        } else if (this.last !== null) {
          this.last.toggle()
          this.last = null;
        }
      }
    });
  }

  playing(player: Player) {
    if (this.current === player) {
      return;
    }
    if (this.current !== null) {
      this.current.pause();
    }
    this.current = player;
    if (this.clockSub) {
      this.clockSub.unsubscribe();
    }
    this.clockSub = player.textTimestamp.subscribe((ts) => {
      this.clock.next(ts);
    })
    if (this.playingSub) {
      this.playingSub.unsubscribe();
    }
    this.playingSub = player.playing.subscribe((playing) => {
      this.isPlaying.next(playing);
    });
  }

  stopped(player: Player) {
    if (this.current === player) {
      this.last = player;
      this.current = null;
      this.isPlaying.next(false);
      if (this.clockSub) {
        this.clockSub.unsubscribe();
        this.clockSub = null;
        // this.clock.next('');
      }
      if (this.playingSub) {
        this.playingSub.unsubscribe();
        this.playingSub = null;
      }
    }
  }
}
