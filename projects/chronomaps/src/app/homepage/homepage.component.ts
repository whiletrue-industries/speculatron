import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-homepage',
    imports: [],
    templateUrl: './homepage.component.html',
    styleUrl: './homepage.component.less'
})
export class HomepageComponent {

  found = true;

  constructor(private route: ActivatedRoute) {
    route.params.subscribe((params) => {
      console.log('params', params);
      try {
        const dbId = parseInt(params['dbid']);
        this.found = dbId > 0;
      } catch (e) {
        this.found = false;
      }
    });
  }
}
