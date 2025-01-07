import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, ReplaySubject, Subject } from 'rxjs';
import { delay, first, switchMap, tap } from 'rxjs/operators';
import { ChronomapDatabase, TimelineItem } from '../../data.service';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-content-video',
    templateUrl: './content-video.component.html',
    styleUrls: ['./content-video.component.less'],
    standalone: false
})
export class ContentVideoComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @Input() item: TimelineItem;
  @Input() activeItem: TimelineItem;

  @Input() chronomap: ChronomapDatabase;

  @ViewChild('frame', {static: true}) frame: ElementRef;
  player: YT.Player;
  playerReady = new ReplaySubject<void>(1);
  resizeObserver: ResizeObserver;
  initialize = new Subject<void>();

  constructor(private sanitizer: DomSanitizer, private http: HttpClient, private el: ElementRef) {
    this.initialize.pipe(
      switchMap(() => this.http.get('https://www.youtube.com/oembed', {params: {url: this.item.youtube_video_id, format: 'json'}})),
      tap(() => {
        this.frame.nativeElement.innerHTML = '';
      }),
      delay(0),
    ).subscribe((data: any) => {
      const el = this.el.nativeElement as HTMLElement;
      const width = Math.min(el.offsetWidth, 640);
      const height = (width * 3) / 4;
      console.log('INIT YOUTUBE', this.frame.nativeElement, this.item.youtube_video_id, width, this.el.nativeElement.offsetWidth);
      const embedCode = data.html || '';
      const srcPos = embedCode.indexOf('src="');
      if (srcPos !== -1) {
        const embedUrl = new URL(embedCode.slice(srcPos).split('"')[1]);
        const videoId = embedUrl.pathname.split('/').pop();
        const start = parseInt(embedUrl.searchParams.get('start') || '0', 10);
        const frame = this.frame.nativeElement as HTMLElement;
        this.player = new YT.Player(frame.appendChild(document.createElement('div')), {
          videoId,
          height: height + 'px',
          width: width + 'px',
          events: {
            onReady: () => {
              // console.log('YOUTUBE READY');
              this.playerReady.next();
              this.playerReady.complete();
            }
          },
          playerVars: {
            enablejsapi: 1,
            start
          }
        });
      }
    });
  }

  ngOnInit(): void {
  }

  ngOnChanges() {
    const active = this.activeItem === this.item;
    if (active) {
      this.playerReady.pipe(first())
      .subscribe(() => {
        if (active && this.player?.getPlayerState && this.player.getPlayerState() !== YT.PlayerState.PLAYING) {
          this.player.playVideo();
        }
      });  
    } else {
      this.playerReady.pipe(first())
      .subscribe(() => {
        if (!active && this.player?.getPlayerState && this.player.getPlayerState() !== YT.PlayerState.PAUSED && this.player.getPlayerState() !== YT.PlayerState.ENDED) {
          this.player.pauseVideo();
        }
      });  
    }
  }

  ngAfterViewInit() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver((entries) => {
      console.log('RESIZE', this.item.youtube_video_id, entries);
      this.initialize.next();
    });
    this.resizeObserver.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
