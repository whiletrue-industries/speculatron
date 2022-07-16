import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainComponent } from './main/main.component';
import { TimelineMapComponent } from './timeline-map/timeline-map.component';
import { LayoutComponent } from './layout/layout.component';
import { InfobarComponent } from './infobar/infobar.component';
import { ContentComponent } from './content/content.component';
import { ContentPlaceholderComponent } from './content-placeholder/content-placeholder.component';
import { ContentAudioComponent } from './content/content-audio/content-audio.component';
import { ContentVideoComponent } from './content/content-video/content-video.component';
import { ContentImageComponent } from './content/content-image/content-image.component';
import { ContentTwitterComponent } from './content/content-twitter/content-twitter.component';
import { ContentInstagramComponent } from './content/content-instagram/content-instagram.component';
import { ContentWikipediaComponent } from './content/content-wikipedia/content-wikipedia.component';
import { AudioPlayerComponent } from './audio-player/audio-player.component';
import { HttpClientModule } from '@angular/common/http';
import { AddNewBarComponent } from './add-new-bar/add-new-bar.component';
import { FormsModule } from '@angular/forms';
import { MapSelectorComponent } from './map-selector/map-selector.component';
import { LayersBarComponent } from './layers-bar/layers-bar.component';
import { LayersBarItemComponent } from './layers-bar/layers-bar-item/layers-bar-item.component';

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    TimelineMapComponent,
    LayoutComponent,
    InfobarComponent,
    ContentComponent,
    ContentPlaceholderComponent,
    ContentAudioComponent,
    ContentVideoComponent,
    ContentImageComponent,
    ContentTwitterComponent,
    ContentInstagramComponent,
    ContentWikipediaComponent,
    AudioPlayerComponent,
    AddNewBarComponent,
    LayersBarComponent,
    MapSelectorComponent,
    LayersBarItemComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
