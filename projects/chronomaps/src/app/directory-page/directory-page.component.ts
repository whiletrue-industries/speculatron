import { Component, signal } from '@angular/core';
import { DataService } from '../data.service';

@Component({
  selector: 'app-directory-page',
  templateUrl: './directory-page.component.html',
  styleUrl: './directory-page.component.less'
})
export class DirectoryPageComponent {

  timelineState = signal<string>('');

  constructor(public data: DataService) { }

}
