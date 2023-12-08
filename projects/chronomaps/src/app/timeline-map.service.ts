import { HORIZONTAL_LAYOUT } from 'CONFIGURATION';
import * as dayjs from 'dayjs';
import { forkJoin, ReplaySubject } from 'rxjs';
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
  LOGO_URL = '';

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
          ret[i.fields.key] = i.fields.value || i.fields.image;
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
      this.ready,
    ]).pipe(
      map(([layers, views, _]) => {
        const allLayers = new Set();
        Object.values(views).forEach((view: any) => {
          const onLayers: string[] = [];
          (view.map_layers || []).forEach((v: any) => {
            onLayers.push(...layers[v].onLayers);
          });
          onLayers.forEach(allLayers.add, allLayers);
          view.onLayers = onLayers;
        });
        this.timeline.forEach((item: any) => {
          item.onLayers = [];
          if ((!item.map_view || item.map_view.length == 0) && item.map_layer && item.map_layer.length > 0) {
            const layer = layers[item.map_layer[0]];
            layer.onLayers.forEach((l: string) => allLayers.add(l));
            item.onLayers = layer.onLayers;
          }
        });
        Object.values(views).forEach((view: any) => {
          view.offLayers = [...allLayers].filter((l) => view.onLayers.indexOf(l) < 0);
        });
        this.timeline.forEach((item: any) => {
          item.offLayers = [...allLayers].filter((l) => item.onLayers.indexOf(l) < 0);
        });
        return views;
      })
    );
  }

  hashCode(str: string) {
    let hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      chr   = str.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  };
  
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
        this.LOGO_URL = (settings['logo'] || [])[0]?.thumbnails?.large?.url || 'assets/img/st_logo.svg';

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
          item.timestamp = dayjs(item.post_timestamp).toDate();
          item.year = (item.timestamp as Date).getFullYear();
          if (item.year > this.YEAR_END) {
            this.YEAR_END = item.year;
          }
          if (item.year < this.YEAR_START) {
            this.YEAR_START = item.year;
          }
          const authorEmail = item.existing_author_email || item.new_author_email;
          const authorName = item.new_author_name;
          const originalAuthor = !!item.original_author;
          item.author = authorEmail;
          if (!authors[authorEmail]) {
            authors[authorEmail] = {
              email: authorEmail,
              count: 0,
              hash: this.hashCode(authorEmail),
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

  explodeTimeline() {
    
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
      if (!added && !HORIZONTAL_LAYOUT) {
        ret.push({year, content, placeholder: true});
      }
    }
    const indexes: any = {};
    for (const i in ret) {
      indexes[i] = ret[i];
    }
    ret.forEach((item, index) => {
      item.index = index;
      item.next = indexes[index + 1] || null;
      item.prev = indexes[index - 1] || null;
    });
    if (update) {
      this.data.next(ret);
    }
    return ret;
  }
}
