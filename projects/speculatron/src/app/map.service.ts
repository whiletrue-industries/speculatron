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
    mapboxgl.setRTLTextPlugin(
      'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
      console.error,
      true // Lazy load the plugin
    );
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

  parseMapView(view: any): mapboxgl.FlyToOptions {
    if (!view.geo) {
      return {};
    }
    const geoRe = /center:\s*\{\s*lon:\s*([-0-9.]+),\s*lat:\s*([-0-9.]+)\s*\},\s*zoom:\s*([-0-9.]+),\s*pitch:\s*([-0-9.]+),\s*bearing:\s*([-0-9.]+)/g;
    const parsed = geoRe.exec(view.geo);
    if (parsed !== null) {
      const options: mapboxgl.FlyToOptions = {
        center: {
          lon: parseFloat(parsed[1]),
          lat: parseFloat(parsed[2]),
        },
        zoom: parseFloat(parsed[3]),
        pitch: parseFloat(parsed[4]),
        bearing: parseFloat(parsed[5])
      }
      if (view.curve) {
        options.curve = view.curve;
      }
      if (view.speed) {
        options.speed = view.speed;
      }
      return options;
    } else {
      return {};
    }
  }
}
