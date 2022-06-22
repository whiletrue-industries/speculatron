import * as dayjs from 'dayjs';
import { forkJoin, ReplaySubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';


export class TimelineMapService {

  YEAR_START = 1901;
  YEAR_END = 2100;
  YEAR_CURRENT = 2050;
  ABOUT = '';

  ready = new ReplaySubject<boolean>(1);

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
    return this.api.airtableFetch(this.baseId, 'Content', 'website').pipe(this.api.airtableToMapping());
  }

  fetchTimeline() {
    return this.api.airtableFetch(this.baseId, 'Timeline', 'website').pipe(
      map((response: any) => response.records.map((i: any) => i.fields))
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
        return forkJoin([
          this.fetchAudioTimestamps(),
          this.fetchContent(),
          this.fetchTimeline(),
        ]);
      }),
      map(([audioTimestamps, content, timeline]) => {
        Object.values(content).forEach((item: any) => {
          if (item.audio_timestamps) {
            item.audio_timestamps = item.audio_timestamps.map((x: string) => audioTimestamps[x]);
          } else {
            item.audio_timestamps = []
          }
        });
        timeline.forEach((item: any) => {
          item.content = item.content.map((id: any) => content[id]);
          item.year = dayjs(item.date).year();
        });
        return (timeline as any[]).sort((a, b) => a.year - b.year);
      }),
      map((timeline) => {
        const ret = [];
        const content: any[] = [];
        for (let year = this.YEAR_START; year <= this.YEAR_END; year++) {
          if (timeline.length > 0) {
            if (timeline[0].year === year) {
              ret.push(timeline.shift());
              continue;
            }
          }
          ret.push({year, content});
        }
        this.ready.next(true);
        return ret;
      })
    );
  }
}
