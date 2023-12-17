import { BehaviorSubject, from, fromEvent, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, first, map, tap } from 'rxjs/operators';

import { PlayerService } from './player.service';

export class Player {
    audio: HTMLAudioElement | null;
    subscriptions: Subscription[] = [];

    playing = new BehaviorSubject<boolean>(false); 
    ready = new BehaviorSubject<boolean>(false); 
    hiResTimestamp = new BehaviorSubject<number>(0); 
    textTimestamp = new BehaviorSubject<string>('-00:00');
    position = new BehaviorSubject<number>(0); 
    ended = new Subject();; 

    constructor(public url: string, private playerService: PlayerService) {
        this.audio = new Audio(url);
        fromEvent(this.audio, 'canplaythrough').pipe(first()).subscribe(() => {
            this.ready.next(true);
            this.updateTextTimestamp();
        });
        this.subscriptions.push(...[
            fromEvent(this.audio, 'play').subscribe(() => {
                this.playing.next(true);
            }),
            fromEvent(this.audio, 'pause').subscribe(() => {
                this.playing.next(false);
            }),
            fromEvent(this.audio, 'ended').subscribe(() => {
                this.ended.next(null);
                this.playing.next(false);
                if (this.audio) {
                    this.audio.currentTime = 0;
                }
            }),
            fromEvent(this.audio, 'timeupdate').pipe(
                map(() => {
                    if (this.audio !== null) {
                        const hiResTimestamp = Math.floor(this.audio.currentTime * 10);
                        const currentHiResTimestamp = this.hiResTimestamp.getValue()
                        if (hiResTimestamp !== currentHiResTimestamp) {
                            if (currentHiResTimestamp < hiResTimestamp && hiResTimestamp - currentHiResTimestamp < 20) {
                                for (let t = currentHiResTimestamp+ 1  ; t <= hiResTimestamp ; t++) {
                                    this.hiResTimestamp.next(t);
                                }
                            } else {
                                this.hiResTimestamp.next(hiResTimestamp);
                            }
                        }
                        const timestamp = Math.floor(this.audio.currentTime);
                        this.updateTextTimestamp();
                        return Math.round(this.audio.currentTime / this.audio.duration * 1000);
                    }
                    return 0;
                }),
                distinctUntilChanged(),
            ).subscribe((pos) => {
                this.position.next(pos);
            })
        ]);
        this.playing.next(false);
        this.audio.load();
    }

    seek(percent: number) {
        if (this.audio) {
            this.audio.currentTime = this.audio.duration * percent;
        }
    }
    
    seekTime(seconds: number) {
        return this.ready.pipe(
            filter((x) => x),
            first(),
            tap(() => {
                if (this.audio !== null) {
                    this.audio.currentTime = seconds;
                }
            })
        ).toPromise();
    }

    play() {
        if (!this.playing.getValue()) {
            this.ready.pipe(
                filter((x) => x),
                first()
            ).subscribe(() => {
                if (this.audio) {
                    this.audio.play()
                        .then(() => {
                            this.playerService.playing(this);
                        })
                        .catch(() => {
                            console.log('FAILED TO PLAY...');
                        });
                }
            });
        }
    }

    pause() {
        if (this.playing.getValue()) {
            if (this.audio) {
                this.audio.pause();
                this.playerService.stopped(this);    
            }
        }
    }

    toggle() {
        if (this.playing.getValue()) {
            this.pause();
        } else {
            this.play();
        }
    }

    cleanup() {
        if (this.audio !== null) {
            this.pause();
            this.audio.remove();
            this.audio = null;
        }
        while (this.subscriptions.length > 0) {
            this.subscriptions.shift()?.unsubscribe();
        }
    }

    updateTextTimestamp() {
        if (!this.audio || !Number.isFinite(this.audio.duration)) {
            return;
        }
        const left = Math.floor(this.audio.duration - this.audio.currentTime);
        // const left = Math.floor(this.audio.currentTime);
        let textTimestamp = '' + (left % 60);
        if (textTimestamp.length < 2) {
            textTimestamp = '0' + textTimestamp;
        }
        textTimestamp = Math.floor(left / 60) + ':' +textTimestamp;
        if (textTimestamp.length < 5) {
            textTimestamp = '0' + textTimestamp;
        }
        textTimestamp = '-' + textTimestamp;
        if (textTimestamp !== this.textTimestamp.getValue()) {
            this.textTimestamp.next(textTimestamp);
        }
    }
}
