import { ChronomapDatabase } from "../data.service";
import { LayoutService } from "../layout.service";
import { MapHandler } from "./map-handler-base";
import { MapHandlerMapbox } from "./map-handler-mapbox";


export function getMapHandler(owner: any, layout: LayoutService, chronomap: ChronomapDatabase): MapHandler<any, any> {
  return new MapHandlerMapbox(owner, layout, chronomap);
}