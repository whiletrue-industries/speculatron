export type LatLon = {
  lat: number;
  lon: number;
};

export type FlyToOptions = {
  center?: LatLon;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  padding?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  speed?: number;
  duration?: number;
  curve?: number;
};

export type BoundsOptions = [[number, number], [number, number]];

export class MapUtils {

  static setLayerSource(map: mapboxgl.Map, layerId: string, source: string) {
    const oldLayers = map.getStyle()?.layers || [];
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

  static parseMapView(view: string): FlyToOptions {
    if (!view) {
      return {};
    }
    const geoConcat = view.split('#')[1];
    if (!geoConcat) {
      return {};
    }
    const parsed = geoConcat.split('/');
    if (parsed !== null) {
      const options: FlyToOptions = {
        zoom: parseFloat(parsed[0]),
        center: {
          lat: parseFloat(parsed[1]),
          lon: parseFloat(parsed[2]),
        },
      };
      if (parsed.length > 3) {
        options.bearing = parseFloat(parsed[3]);
        if (isNaN(options.bearing)) {
          options.bearing = undefined;
        }
      }
      if (parsed.length > 4) {
        options.pitch = parseFloat(parsed[4]);
        if (isNaN(options.pitch)) {
          options.pitch = undefined;
        }
      }
      return options;
    } else {
      return {};
    }
  }
}
