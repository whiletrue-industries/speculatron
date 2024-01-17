import { Component } from '@angular/core';
import { marked } from 'marked';
import { DataService } from './data.service';

// import * as durationPlugin from 'dayjs/plugin/duration';
import * as relativeTimePlugin from 'dayjs/plugin/relativeTime';
import * as utcPlugin from 'dayjs/plugin/utc';
import * as dayjs from 'dayjs';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, map } from 'rxjs';
import { StateService } from './state.service';

// import 'dayjs/locale/he';
// dayjs.locale('he')

// dayjs.extend(durationPlugin);
dayjs.extend(relativeTimePlugin);
dayjs.extend(utcPlugin);

@UntilDestroy()
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {
  found = true;

  constructor(private route: ActivatedRoute) {
    // Marked.js options
    const renderer = new marked.Renderer();
    const linkRenderer = renderer.link;
    renderer.link = (href: string, title: string, text: string) => {
      const localLink = href.startsWith(`${location.protocol}//${location.hostname}`);
      const html = linkRenderer.call(renderer, href, title, text);
      return localLink ? html : html.replace(/^<a /, `<a target="_blank" rel="noreferrer noopener nofollow" `);
    };
    marked.use({renderer});
  }

}
