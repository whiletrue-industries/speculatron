import * as dayjs from 'dayjs';
import { forkJoin, ReplaySubject, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';


export class TimelineMapService {

  YEAR_START = 1901;
  YEAR_END = 2100;
  YEAR_CURRENT = 2050;
  TITLE = '';
  SUBTITLE = '';
  INFOBAR_TITLE = '';
  INFOBAR_SUBTITLE = '';
  ABOUT = '';
  CONTRIBUTE_MESSAGE = '';

  ready = new ReplaySubject<boolean>(1);
  data = new ReplaySubject<any[]>(1);

  authorsMap: any = {};
  authorsList: any[] = [];
  timeline: any[] = [];
  contribCount = 0;

  constructor(
      private api: ApiService, 
      private baseId: string,
  ) { }

  fetchSettings() {
    return this.api.airtableFetch(this.baseId, 'Settings', 'website').pipe(
      map((response: any) => {
        const ret: any = {};
        response.records.forEach((i: any) => {
          ret[i.fields.key] = i.fields.value;
        });
        return ret;
      })
    );
  }

  fetchAudioTimestamps() {
    return this.api.airtableFetch(this.baseId, 'AudioTimestamps', 'website').pipe(this.api.airtableToMapping());
  }
  
  fetchMapLayers() {
    return this.api.airtableFetch(this.baseId, 'MapLayers', 'website').pipe(this.api.airtableToMapping());
  }
  
  fetchMapViews() {
    return this.api.airtableFetch(this.baseId, 'MapViews', 'website').pipe(this.api.airtableToMapping());
  }

  fetchContent() {
    return this.api.airtableFetch(this.baseId, this.api.CONTENT_TABLE, 'website').pipe(
      this.api.airtableToArray(),
    );
  }

  fetchMapData() {
    return forkJoin([
      this.fetchMapLayers(),
      this.fetchMapViews(),
    ]).pipe(
      map(([layers, views]) => {
        const allLayers = new Set();
        Object.values(views).forEach((view: any) => {
          const onLayers: string[] = [];
          (view.map_layers || []).forEach((v: any) => {
            onLayers.push(...layers[v].on_layers);
          });
          onLayers.forEach(allLayers.add, allLayers);
          view.onLayers = onLayers;
        });
        Object.values(views).forEach((view: any) => {
          view.offLayers = [...allLayers].filter((l) => view.onLayers.indexOf(l) < 0);
        });
        return views;
      })
    );
  }

  fetchData() {
    return this.fetchSettings().pipe(
      switchMap((settings) => {
        this.YEAR_START = parseInt(settings['from year']);
        this.YEAR_END = parseInt(settings['to year']);
        this.YEAR_CURRENT = parseInt(settings['start year']);
        this.ABOUT = settings['about'];
        this.TITLE = settings['title'];
        this.SUBTITLE = settings['subtitle'];
        this.INFOBAR_TITLE = settings['infobar_title'];
        this.INFOBAR_SUBTITLE = settings['infobar_subtitle'];
        this.CONTRIBUTE_MESSAGE = settings['contribute_message'];

        return forkJoin([
          this.fetchAudioTimestamps(),
          this.fetchContent(),
        ]);
      }),
      map(([audioTimestamps, content]) => {
        const authors: any = {};
        content.forEach((item: any) => {
          if (item.audio_timestamps) {
            item.audio_timestamps = item.audio_timestamps.map((x: string) => audioTimestamps[x]);
          } else {
            item.audio_timestamps = []
          }
          item.hasContent = true;
          item.year = dayjs(item.post_timestamp).year();
          const authorEmail = item.existing_author_email || item.new_author_email;
          const authorName = item.new_author_name;
          const originalAuthor = !!item.original_author;
          item.author = authorEmail;
          if (!authors[authorEmail]) {
            authors[authorEmail] = {
              email: authorEmail,
              count: 0,
            };
          }
          authors[authorEmail].count++;
          if (authorName) {
            authors[authorEmail].name = authorName;
          }
          authors[authorEmail].originalAuthor = authors[authorEmail].originalAuthor || originalAuthor;
          authors[authorEmail].selected = authors[authorEmail].selected || originalAuthor;
        });
        this.authorsMap = authors;
        this.authorsList = [];
        Object.values(authors).sort((a: any, b: any) => (a.originalAuthor ? 0 : 1) - (b.originalAuthor ? 0 : 1)).forEach((author: any) => {
          this.authorsList.push(author);
        });
        // console.log('CONTENT', JSON.stringify(content));
        return (content as any[]).sort((a, b) => a.post_timestamp - b.post_timestamp);
      }),
      map((timeline) => {
        this.timeline = timeline;
        this.contribCount = this.authorsList.filter((i: any) => !i.originalAuthor).length;
        const ret = this.updateTimeline(false);
        this.ready.next(true);
        this.ready.complete();
        this.data.next(ret);
      })
    );
  }

  updateTimeline(update = true) {
    console.log('UPDATING TIMELINE...');
    const ret = [];
    const content: any[] = [];
    const timeline = this.timeline.slice();
    for (let year = this.YEAR_START; year <= this.YEAR_END; year++) {
      let added = false;
      while (timeline.length > 0 && timeline[0].year === year) {
        const item = timeline.shift();
        const author = this.authorsMap[item.author];
        if (author?.selected) {
          ret.push(item);
          added = true;
        }
      }
      if (!added) {
        ret.push({year, content});
      }
    }
    if (update) {
      this.data.next(ret);
    }
    return ret;
  }
}
