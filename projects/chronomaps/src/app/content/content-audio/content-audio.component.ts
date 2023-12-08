import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { PRIMARY_COLOR } from 'CONFIGURATION';
import { Subscription } from 'rxjs';
import { AudioPlayerComponent } from '../../audio-player/audio-player.component';

@Component({
  selector: 'app-content-audio',
  templateUrl: './content-audio.component.html',
  styleUrls: ['./content-audio.component.less']
})
export class ContentAudioComponent implements OnInit, OnChanges, AfterViewInit{

  @Input() item: any;
  @Input() activeItem: any;
  @Output() mapView = new EventEmitter<any>();
  @ViewChild(AudioPlayerComponent, {static: true}) player: AudioPlayerComponent;
  sub: Subscription | null = null;
  linkHover = false;

  PRIMARY_COLOR = PRIMARY_COLOR;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(): void {
    this.update();
  }

  ngAfterViewInit(): void {
    this.update();
  }

  update() {
    if (this.player && this.player.player) {
      if (this.activeItem === this.item) {
        this.player.player.play();
        if (this.sub === null) {
          if (this.item.audio_timestamps && this.item.audio_timestamps.length) {
            this.sub = this.player.player.hiResTimestamp.subscribe((timestamp) => {
              const timestamps = this.item.audio_timestamps.filter((at: any) => at.timestamp * 10 === timestamp);
              if (timestamps.length && timestamps[0].map_view && timestamps[0].map_view.length) {
                this.mapView.emit(timestamps[0].map_view[0]);
              }
            });
          }
        }
      } else {
        this.player.player.pause();
        if (this.sub !== null) {
          this.sub.unsubscribe();
          this.sub = null;
        }
      }  
    }
  }

}
