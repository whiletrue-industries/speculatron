import { ChronomapDatabase } from "../data.service";
import { LayoutService } from "../layout.service";
import { MapHandler } from "./map-handler-base";
import { MapHandlerLeaflet } from "./map-handler-leaflet";
import { MapHandlerMapbox } from "./map-handler-mapbox";


export function getMapHandler(owner: any, layout: LayoutService, chronomap: ChronomapDatabase): MapHandler<any, any> {
  if (chronomap.mapboxKey()) {
    return new MapHandlerMapbox(owner, layout, chronomap);
  } else {
    return new MapHandlerLeaflet(owner, layout, chronomap);
  }
}