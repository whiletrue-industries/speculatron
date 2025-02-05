import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ChronomapDatabase, TimelineItem } from '../data.service';
import { timer } from 'rxjs';

@Component({
  selector: 'app-image-icon',
  imports: [],
  templateUrl: './image-icon.component.html',
  styleUrl: './image-icon.component.less'
})
export class ImageIconComponent implements OnChanges {
  @Input() item: TimelineItem;
  @Input() breathing: boolean;
  @Input() chronomap: ChronomapDatabase;

  visited = false;
  bgColor = '';
  altBgColor = '';
  imgHeight: string = 'fit-content';

  ngOnChanges(): void {
    this.visited = this.visited || this.breathing;
    if (this.breathing) {
      this.bgColor = this.chronomap.primaryColor();
      this.altBgColor = this.chronomap.primaryColor();
    } else {
      this.bgColor = this.visited ? this.chronomap.secondaryColor() : this.chronomap.primaryColor();
      this.altBgColor = this.visited ? this.chronomap.primaryColor() : this.chronomap.secondaryColor();
    }
  }

  updateHeight(event: Event): void {
    const img = event.target as HTMLImageElement;
    timer(0).subscribe(() => {
      const targetHeight = img.height/img.width * 60 + 4;
      this.imgHeight = targetHeight + 'px';
      console.log('IMG', img, img.height, '->', this.imgHeight);
    });
  }
}
