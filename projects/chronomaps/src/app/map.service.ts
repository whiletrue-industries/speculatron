import * as mapboxgl from 'mapbox-gl';

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { MAPBOX_ACCESS_TOKEN } from '../../../../CONFIGURATION';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  ACCESS_TOKEN = MAPBOX_ACCESS_TOKEN;

  constructor(private http: HttpClient) {
    (mapboxgl as any).accessToken = this.ACCESS_TOKEN;
    // mapboxgl.setRTLTextPlugin(
    //   'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
    //   console.error,
    //   true // Lazy load the plugin
    // );
  }


  setLayerSource(map: mapboxgl.Map, layerId: string, source: string) {
    const oldLayers = map.getStyle().layers;
    const layerIndex = oldLayers.findIndex(l => l.id === layerId);
    const layerDef: any = oldLayers[layerIndex];
    const before = oldLayers[layerIndex + 1] && oldLayers[layerIndex + 1].id;
    layerDef.source = source;
    if (layerDef['source-layer']) {
      delete layerDef['source-layer'];
    }
    map.removeLayer(layerId);
    map.addLayer(layerDef, before);
  }

  static parseMapView(view: string): mapboxgl.FlyToOptions {
    if (!view) {
      return {};
    }
    const geoConcat = view.split('#')[1];
    if (!geoConcat) {
      return {};
    }
    const parsed = geoConcat.split('/');
    if (parsed !== null) {
      const options: mapboxgl.FlyToOptions = {
        zoom: parseFloat(parsed[0]),
        center: {
          lat: parseFloat(parsed[1]),
          lon: parseFloat(parsed[2]),
        },
      };
      if (parsed.length > 3) {
        options.pitch = parseFloat(parsed[3]);
      }
      if (parsed.length > 4) {
        options.bearing = parseFloat(parsed[4]);
      }
      return options;
    } else {
      return {};
    }
  }
}
