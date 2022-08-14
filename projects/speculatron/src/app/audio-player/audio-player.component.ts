import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { fromEvent, Observable, Subscription } from 'rxjs';
import { takeLast, takeUntil, tap } from 'rxjs/operators';

import { Player } from './player';
import { PlayerService } from './player.service';

@Component({
  selector: 'app-audio-player',
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.less']
})
export class AudioPlayerComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {

  @Input() audio: any;
  @Input() image: any;
  @Input() color: string;
  @Input() size = 280;
  @ViewChild('handle', {static: true}) handle: ElementRef;
  @ViewChild('component', {static: true}) component: ElementRef;


  PADDING = 2;
  BAR_WIDTH = 4;

  player: Player | null = null;
  progressBarPath = '';
  positionSub: Subscription;
  handleX: number;
  handleY: number;

  constructor(private playerService: PlayerService, private el: ElementRef) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
  }

  drag() {
    const rect = (this.component.nativeElement as HTMLElement).getBoundingClientRect();
    fromEvent(window, 'mousemove').pipe(
        // filter((ev: MouseEvent) => ev.target === this.component.nativeElement),
        // takeUntil(fromEvent(this.el.nativeElement, 'mouseleave')),
        takeUntil(fromEvent(window, 'mouseup')),
        tap((event_: Event) => {
          const event: MouseEvent = event_ as MouseEvent;
          const x = event.clientX - rect.left - this.size / 2;
          const y = event.clientY - rect.top - this.size / 2;
          const angle = Math.atan(y/x) + Math.PI / 2 + (x < 0 ? Math.PI : 0);
          this.player?.seek(angle / 2 / Math.PI);
        }),
        takeLast(1)
      ).subscribe((event) => {});
  }

  click(event: MouseEvent) {
    if (!this.player) {
      return false;
    }
    const x = event.offsetX - this.size / 2;
    const y = event.offsetY - this.size / 2;
    const angle = Math.atan(y/x) + Math.PI / 2 + (x < 0 ? Math.PI : 0);
    const r = Math.sqrt(x*x + y*y);
    if (Math.abs(r - this.size/2) < 10) {
      this.player.seek(angle / 2 / Math.PI);
    } else if (r < this.size/2) {
      this.player.toggle();
    }
    return true;
  }

  createPlayer() {
    if (this.audio) {
      this.player = new Player(this.audio, this.playerService);
      this.positionSub = this.player.position.subscribe((pos) => {
        this.calculateProgressBarPath(pos/1000*2*Math.PI);
      });
    }
  }

  cleanupPlayer() {
    if (this.player !== null) {
      this.player.cleanup();
      this.positionSub.unsubscribe();
      this.player = null;
      this.progressBarPath = '';
    }
  }

  ngOnChanges() {
    this.cleanupPlayer();
    this.createPlayer();
  }

  ngOnDestroy() {
    this.cleanupPlayer();
  }

  calculateProgressBarPath(angle: number) {
    const C = this.size/2;
    const R = (this.size - this.BAR_WIDTH) / 2;
    const X = C + R * Math.sin(angle);
    const Y = C - R * Math.cos(angle);
    const params = angle >= Math.PI ? '1 1' : '0 1';
    this.progressBarPath = `M${C} ${C-R} A ${R} ${R} 0 ${params} ${X} ${Y}`;
    this.handleX = X;
    this.handleY = Y;
  }
}
