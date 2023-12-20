import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { ChronomapDatabase, TimelineItem } from '../../data.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-content-video',
  templateUrl: './content-video.component.html',
  styleUrls: ['./content-video.component.less']
})
export class ContentVideoComponent implements OnInit, AfterViewInit, OnChanges {

  @Input() item: TimelineItem;
  @Input() activeItem: TimelineItem;

  @Input() chronomap: ChronomapDatabase;

  @ViewChild('frame', {static: true}) frame: ElementRef;
  player: YT.Player;
  playerReady = new ReplaySubject<void>(1);

  constructor(private sanitizer: DomSanitizer, private http: HttpClient) {}

  ngOnInit(): void {
  }

  ngOnChanges() {
    const active = this.activeItem === this.item;
    if (active) {
      this.playerReady.pipe(first())
      .subscribe(() => {
        if (active && this.player.getPlayerState() !== YT.PlayerState.PLAYING) {
          this.player.playVideo();
        }
      });  
    } else {
      this.playerReady.pipe(first())
      .subscribe(() => {
        if (!active && this.player.getPlayerState() !== YT.PlayerState.PAUSED && this.player.getPlayerState() !== YT.PlayerState.ENDED) {
          this.player.pauseVideo();
        }
      });  
    }
  }

  ngAfterViewInit() {
    // console.log('INIT YOUTUBE', this.frame.nativeElement, this.item.youtube_video_id);
    const el = this.frame.nativeElement as HTMLElement;
    const width = Math.min(el.offsetWidth, 640);
    const height = (width * 3) / 4;
    this.http.get('https://www.youtube.com/oembed', {params: {url: this.item.youtube_video_id, format: 'json'}}).subscribe((data: any) => {
      const embedCode = data.html || '';
      const srcPos = embedCode.indexOf('src="');
      if (srcPos !== -1) {
        const embedUrl = new URL(embedCode.slice(srcPos).split('"')[1]);
        const videoId = embedUrl.pathname.split('/').pop();
        const start = parseInt(embedUrl.searchParams.get('start') || '0', 10);
        this.player = new YT.Player(el, {
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

}
