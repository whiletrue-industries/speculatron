import * as mapboxgl from 'mapbox-gl';

export class MapUtils {

  static setLayerSource(map: mapboxgl.Map, layerId: string, source: string) {
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
        options.bearing = parseFloat(parsed[3]);
      }
      if (parsed.length > 4) {
        options.pitch = parseFloat(parsed[4]);
      }
      return options;
    } else {
      return {};
    }
  }
}
