export type LocationId = string; // stable ID, e.g. "jezero-delta-front"

export interface Location {
  id: LocationId;
  name: string;
  lat: number;
  lon: number;
  crs: string;        // record the coordinate system explicitly
  regionId: string;   // which TerrainRegion it belongs to
}

export interface POI {
  id: string;
  locationId: LocationId;
  category: string;
  description: string;
  sources: string[];  // provenance
}

export interface Mission {
  id: string;
  locationId: LocationId;
  title: string;
  objectives: string[];
  fictional: boolean; // label simulated content honestly
}

export interface Discovery {
  id: string;
  missionId: string;
  locationId: LocationId;
  notes: string;
}