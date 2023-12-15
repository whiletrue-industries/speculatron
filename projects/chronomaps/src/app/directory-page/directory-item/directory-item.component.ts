import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild, WritableSignal, computed, effect, signal } from '@angular/core';
import { Author, ChronomapDatabase, DataService, DirectoryDatabase } from '../../data.service';
import * as dayjs from 'dayjs';
import { last } from 'rxjs';
import { marked } from 'marked';

@Component({
  selector: 'app-directory-item',
  templateUrl: './directory-item.component.html',
  styleUrl: './directory-item.component.less',
  host: {
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
  }
})
export class DirectoryItemComponent implements AfterViewInit {

  @Input() chronomap: ChronomapDatabase;
  @Input() timelineState: WritableSignal<string>;
  @Input() minDate: WritableSignal<Date>;
  @Input() maxDate: WritableSignal<Date>;
  @Input() arrowRight: number;

  @Output() alignment = new EventEmitter<number>();

  @ViewChild('arrowContainer') arrowContainer: ElementRef<HTMLElement>;

  marked = marked;
  
  hovered = signal<boolean>(false);

  authorsMsg = computed(() => {
    const timeline = this.chronomap.timelineItems();
    const authors: {[key: string]: Author} = {};
    const editors: string[] = [];
    let contrubutors = 0;
    timeline.forEach((item) => {
      item.authors?.forEach((author) => {
        authors[author.name] = author;
      });
    });
    Object.values(authors).forEach((author) => {
      if (author.status === 'Editor') {
        editors.push(author.name);
      } else if (author.status === 'Contributor') {
        contrubutors++;
      }
    });
    if (editors.length > 1) {
      const last = editors.pop();
      editors[editors.length - 1] += ` and ${last}`;
    }
    let ret = editors.join(', ');
    if (contrubutors > 0) {
      if (ret.length > 0) {
        ret += ` +${contrubutors} more`;
      } else {
        ret += `${contrubutors} contributor${contrubutors > 1 ? 's' : ''}`;
      }
    }
    ret = `${timeline.length} perspectives by ${ret}`;
    return ret;
  });

  constructor(public data: DataService) {
    effect(() => {
      const items = this.chronomap.timelineItems();
      console.log('items', this.chronomap.title(), items);
      console.log('timelineState', this.timelineState());
    });
  }

  ngAfterViewInit(): void {
    this.alignment.next(this.arrowContainer.nativeElement.getBoundingClientRect().width - 26);
  }

  get lastModified() {
    return dayjs(this.chronomap.lastModified()).fromNow();
  }
}
