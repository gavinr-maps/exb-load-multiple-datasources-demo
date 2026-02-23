import type { ImmutableObject } from 'seamless-immutable'

export enum ReadLayers {
  CITIES = 'cities',
  HIGHWAYS = 'highways',
  STATES = 'states',
  COUNTIES = 'counties',
}

export enum WriteLayers {
  INCIDENTS = 'incidents'
}


export interface Config {
  environment: string;
  read: ServiceConfig<ReadLayers>;
}

/**
 * Service configuration.
 */
export interface ServiceConfig<T extends ReadLayers> {
  urlRegex: string;
  layers: Record<
    T,
    {
      // service layer id
      layerId: number;
      // add layer to the map (defaults to false)
      map?: boolean;
      // layer visibility (defaults to true)
      visible?: boolean;
    }
  >;
}

export type IMConfig = ImmutableObject<Config>
