import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { AudioPlayerComponent } from './audio-player/audio-player.component';
import { ChronomapDatabase, TimelineItem } from '../../data.service';

@Component({
    selector: 'app-content-audio',
    templateUrl: './content-audio.component.html',
    styleUrls: ['./content-audio.component.less'],
    standalone: false
})
export class ContentAudioComponent implements OnInit, OnChanges, AfterViewInit{

  @Input() item: TimelineItem;
  @Input() activeItem: TimelineItem;

  @Input() chronomap: ChronomapDatabase;

  @ViewChild(AudioPlayerComponent, {static: true}) player: AudioPlayerComponent;
  linkHover = false;

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
      } else {
        this.player.player.pause();
      }  
    }
  }

}
