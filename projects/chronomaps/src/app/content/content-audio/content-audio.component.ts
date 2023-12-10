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
  @ViewChild(AudioPlayerComponent, {static: true}) player: AudioPlayerComponent;
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
      } else {
        this.player.player.pause();
      }  
    }
  }

}
