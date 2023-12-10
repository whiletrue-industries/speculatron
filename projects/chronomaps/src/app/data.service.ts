import { Injectable, effect, signal } from '@angular/core';

import { BASEROW_ENDPOINT, BASEROW_ADMIN_DB, BASEROW_ADMIN_TOKEN } from 'CONFIGURATION';
import { BaserowDatabase } from './baserow/baserow-database';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, tap } from 'rxjs';
import * as dayjs from 'dayjs';

export type Author = {
  name: string;
  email: string;
  status: 'Pending' | 'Editor' | 'Contributor';
};


export type ContentItem = {
  id: number;
  title: string;
  post_timestamp: Date;
  alt_post_timestamp: Date;
  status: 'Draft' | 'Review' | 'Published'; 
  type: 'audio' | 'wikipedia' | 'instagram' | 'twitter' | 'image' | 'video';
  youtube_video_id: string;
  content: string;
  image: string;
  audio: string;
  name: string;
  username: string;
  profile_image: string;
  like_count: number;
  comment_count: number;
  link_title: string;
  link_domain: string;
  geo: string;
  map_layers: string[];
  off_map_layers: string[];
  nonce: string;
  authors: Author[];
  tags: string[];
  related: ContentItem[];
};


export class ChronomapDatabase extends BaserowDatabase {

  id: string;
  slug = signal<string>('');
  editor_name = signal<string>('');
  editor_email = signal<string>('');
  pitch = signal<string>('');
  title = signal<string>('');
  subtitle = signal<string>('');
  infobarTitle = signal<string>('');
  inforbarSubtitle = signal<string>('');
  inforbarContent = signal<string>('');
  contributeMessage = signal<string>('');
  mapView = signal<string>('');
  logo = signal<string>('');
  thumbnail = signal<string>('');
  parentLink = signal<string>('..');
  mapStyle = signal<string>('');
  backgroundMapSytle = signal<string>('');
  mapboxKey = signal<string>('');
  showTooltips = signal<boolean>(true);
  altTimestampLabel = signal<string>('');
  postDateFormat = signal<string>('');
  altDateFormat = signal<string>('');
  primaryColor = signal<string>('');
  secondaryColor = signal<string>('');

  contentItems = signal<ContentItem[]>([]);

  allLayers: string[] = [];
  allContentItems: ContentItem[];

  constructor(chronomap: any, private http: HttpClient) {
    super(BASEROW_ENDPOINT, chronomap.Database_Token, chronomap.Database_ID);
    this.id = chronomap.id;
    this.title.set(chronomap.Title);
    this.slug.set(chronomap.URL_Slug);
    this.editor_name.set(chronomap.Editor_Name);
    this.editor_email.set(chronomap.Editor_Email);
    this.pitch.set(chronomap.Pitch);
  }

  fetch() {
    this.fetchTables(this.http).subscribe();
    this.getTable('Settings').subscribe((settingsTable) => {
      const keyValues: any = {};
      settingsTable?.rows.forEach((element: any) => {
        keyValues[element.Key] = {value: element.Value, images: element.Image};
      });
      this.title.set(keyValues.Title?.value || '');
      this.subtitle.set(keyValues.Subtitle?.value || '');
      this.infobarTitle.set(keyValues.Infobar_Title?.value || this.title());
      this.inforbarSubtitle.set(keyValues.Infobar_Subtitle?.value || this.subtitle());
      this.inforbarContent.set(keyValues.Infobar_Content?.value || '');
      this.contributeMessage.set(keyValues.Contribute_Message?.value || '');
      this.mapView.set(keyValues.Default_Map_View?.value || '');
      this.logo.set(keyValues.Logo?.images?.[0]?.url || '');
      this.thumbnail.set(keyValues.Thumbnail?.images?.[0]?.url || '');
      this.parentLink.set(keyValues.Parent_Link?.value || '..');
      this.mapStyle.set(keyValues.Map_Style?.value || '');
      this.backgroundMapSytle.set(keyValues.Background_Map_Style?.value || '');
      this.mapboxKey.set(keyValues.Mapbox_Key?.value || '');
      this.showTooltips.set(keyValues.Show_Tooltips?.value === 'true');
      this.altTimestampLabel.set(keyValues.Alt_Timestamp_Label?.value || '');
      this.postDateFormat.set(keyValues.Post_Date_Format?.value || '');
      this.altDateFormat.set(keyValues.Alt_Date_Format?.value || '');
      this.primaryColor.set(keyValues.Primary_Color?.value || '');
      this.secondaryColor.set(keyValues.Secondary_Color?.value || '');
    });
    forkJoin([
      this.getTable('MapLayers'),
      this.getTable('Authors'),
      this.getTable('Content'),
    ]).pipe(
      map(([mapLayersTable, authorsTable, contentTable]) => {
        this.allLayers = [];
        const layers: any = {};
        mapLayersTable?.rows.forEach((row: any) => {
          const onLayers = row.On_Layers.map((x : any) => x.value) || [];
          onLayers.forEach((layer: string) => {
            if (!this.allLayers.includes(layer)) {
              this.allLayers.push(layer);
            }
          });
          layers[row.Name] = onLayers;
        });
        const authors: any = {};
        authorsTable?.rows.forEach((row: any) => {
          authors[row.Name] = {
            email: row.Email,
            status: row.Status,
          };
        });
        const contentItems: ContentItem[] = [];
        contentTable?.rows.forEach((row: any) => {
          const item: any = {
            id: row.id,
            title: row.Title,
            post_timestamp: dayjs(row.Post_Timestamp).toDate(),
            status: row.Status,
            type: row.Type,
            youtube_video_id: row.Youtube_Video_Id,
            content: row.Content,
            image: row.Image?.[0]?.url,
            audio: row.Audio?.[0]?.url,
            name: row.Name,
            username: row.Username,
            profile_image: row.Profile_Image?.[0]?.url,
            like_count: row.Like_Count,
            comment_count: row.Comment_Count,
            link_title: row.Link_Title,
            link_domain: row.Link_Domain,
            geo: row.Geo,
            map_layers: [],
            off_map_layers: [],
            nonce: row.Nonce,
            authors: row.Authors?.map((x: any) => authors[x.value]) || [],
            tags: row.Tags?.map((x: any) => x.value) || [],
            related: row.Related?.map((x: any) => ({id: x.id})) || [],
          };
          item.alt_post_timestamp = row.Alt_Post_Timestamp ? dayjs(row.Alt_Post_Timestamp).toDate() : item.post_timestamp;
          row.Map_Layer.forEach((x: any) => {
            const name = x.value;
            if (layers[name]) {
              layers[name].forEach((layer: string) => {
                if (!item.map_layers.includes(layer)) {
                  item.map_layers.push(layer);
                }
              });
            }
          });
          this.allLayers.forEach((layer: string) => {
            if (!item.map_layers.includes(layer)) {
              item.off_map_layers.push(layer);
            }
          });
          const contentItem: ContentItem = item;
          if (contentItem.status === 'Published') {
            if (contentItem.authors.find((author: Author) => author.status === 'Editor' || author.status === 'Contributor')) {
              contentItems.push(contentItem);
            }
          }
        });
        contentItems.forEach((item: ContentItem) => {
          item.related = item.related.map((id: ContentItem) => (contentItems.find((i: ContentItem) => i.id === id.id) || {}) as ContentItem).filter((i: ContentItem) => !!i.id);
        });
        return contentItems.sort((a: ContentItem, b: ContentItem) => a.post_timestamp.getTime() - b.post_timestamp.getTime());
      }),
    ).subscribe((contentItems: ContentItem[]) => {
      this.allContentItems = contentItems;
      this.contentItems.set(contentItems);
    });
  }
}


export class DirectoryDatabase extends BaserowDatabase {

  chronomaps = signal<ChronomapDatabase[]>([]);
  title = signal<string>('');
  subtitle = signal<string>('');
  titleImageUrl = signal<string>('');
  description = signal<string>('');
  fullDescription = signal<string>('');
  logos = signal<string[]>([]);
  logoLinks = signal<string[]>([]);
  primaryColor = signal<string>('#000000');
  secondaryColor = signal<string>('#ffffff');
  zoomFrom = signal<number>(1900);
  zoomUntil = signal<number>(2100);
  url = signal<string>('');

  constructor(private http: HttpClient) {
    super(BASEROW_ENDPOINT, BASEROW_ADMIN_TOKEN, BASEROW_ADMIN_DB);
  }

  fetchMaps() {
    this.fetchTables(this.http).subscribe();
    this.getTable('Settings').subscribe((settingsTable) => {
      const keyValues: any = {};
      settingsTable?.rows.forEach((element: any) => {
        keyValues[element.Key] = {value: element.Value, images: element.Image};
      });
      this.title.set(keyValues.Title?.value || '');
      this.subtitle.set(keyValues.Subtitle?.value || '');
      this.titleImageUrl.set(keyValues.Title_Image?.images?.[0]?.url || '');
      this.description.set(keyValues.Description.value);
      this.fullDescription.set(keyValues.Full_Description.value);
      this.logos.set((keyValues.Logos?.images || []).map((i: any) => i.url));
      this.logoLinks.set(keyValues.Logos?.images?.value?.split(',') || []);
      this.primaryColor.set(keyValues.Primary_Color.value);
      this.secondaryColor.set(keyValues.Secondary_Color.value);
      this.zoomFrom.set(keyValues.Zoom_From.value);
      this.zoomUntil.set(keyValues.Zoom_Until.value);
      this.url.set(keyValues.URL.value);
    });
    this.getTable('Chronomaps').subscribe((chronomapsTable) => {
      this.chronomaps.set(chronomapsTable?.rows.map((chronomap: any) => {
        const map = new ChronomapDatabase(chronomap, this.http);
        map.fetch();
        return map;
      }) || []);
    });
  }
}


@Injectable({
  providedIn: 'root'
})
export class DataService {

  directory: DirectoryDatabase;

  constructor(private http: HttpClient) {
    this.fetchData();
    effect(() => {
      console.log('data!', this.directory.title());
    });
  }

  fetchData() {
    this.directory = new DirectoryDatabase(this.http);
    this.directory.fetchMaps();
  }
}
