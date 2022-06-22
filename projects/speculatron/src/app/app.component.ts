import { Component } from '@angular/core';
import { marked } from 'marked';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {
  constructor() {
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
