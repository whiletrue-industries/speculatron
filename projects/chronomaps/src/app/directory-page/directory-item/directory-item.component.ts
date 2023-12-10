import { Component, Input, WritableSignal, effect, signal } from '@angular/core';
import { ChronomapDatabase, DataService, DirectoryDatabase } from '../../data.service';

@Component({
  selector: 'app-directory-item',
  templateUrl: './directory-item.component.html',
  styleUrl: './directory-item.component.less'
})
export class DirectoryItemComponent {

  @Input() chronomap: ChronomapDatabase;
  @Input() timelineState: WritableSignal<string>;

  constructor(public data: DataService) {
  }

}
