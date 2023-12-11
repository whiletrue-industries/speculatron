import { Component, effect, signal } from '@angular/core';
import { DataService } from '../data.service';
import { marked } from 'marked';

@Component({
  selector: 'app-directory-page',
  templateUrl: './directory-page.component.html',
  styleUrl: './directory-page.component.less'
})
export class DirectoryPageComponent {

  timelineState = signal<string>('');
  minDate = signal<Date>(new Date());
  maxDate = signal<Date>(new Date());

  arrowRight = signal<number>(0);
  alignment: {[key: string]: number} = {};
  fullDescription = signal<boolean>(false);

  marked = marked;

  constructor(public data: DataService) {
    effect(() => {
      let minDate: Date|null = null;
      let maxDate: Date|null = null;
      this.data.directory.chronomaps().forEach((chronomap) => {
        chronomap.timelineItems().forEach((item) => {
          if (item.post_timestamp) {
            if (!minDate || item.post_timestamp < minDate) {
              minDate = item.post_timestamp;
            }
            if (!maxDate || item.post_timestamp > maxDate) {
              maxDate = item.post_timestamp;
            }
          }
        });
      });
      minDate = minDate || new Date();
      maxDate = maxDate || new Date();
      const delta = (maxDate.getTime() - minDate.getTime()) / 10;
      minDate = new Date(minDate.getTime() - delta);
      maxDate = new Date(maxDate.getTime() + delta);
      const minView = new Date(this.data.directory.zoomFrom(), 0, 1);
      const maxView = new Date(this.data.directory.zoomUntil(), 11, 31);
      const midView = new Date((minView.getTime() + maxView.getTime()) / 2).getTime();
      const zoom = Math.max(0, (maxDate.getTime() - minDate.getTime()) / (maxView.getTime() - minView.getTime()));
      this.timelineState.set(`${midView}@${zoom}`);
      this.minDate.set(minDate);
      this.maxDate.set(maxDate);
    }, {allowSignalWrites: true});
  }

  align(id: string, width: number) {
    this.alignment[id] = width;
    const min = Math.min(...Object.values(this.alignment));
    this.arrowRight.set(min);
  }

}
