import { PERSEVERANCE_SAMPLE_SITES } from './perseveranceSamples.js'

// These educational labels sit at mapped Perseverance traverse waypoints.
// They describe Jezero generally, not a verified find at each coordinate.
const TRAVERSE_WAYPOINTS = [
  { id: 'basalt', name: 'Volcanic geology', longitude: 77.45258735, latitude: 18.44412598, elevation: -2568.81 },
  { id: 'lake', name: 'Ancient lake history', longitude: 77.45031774, latitude: 18.4417782, elevation: -2568.672852 },
  { id: 'rim', name: 'Crater formation', longitude: 77.44941141, latitude: 18.43957131, elevation: -2568.958984 },
  { id: 'delta', name: 'River delta history', longitude: 77.45214885, latitude: 18.4311366, elevation: -2580.235 },
  { id: 'dust', name: 'Martian regolith', longitude: 77.44332408, latitude: 18.4312302, elevation: -2574.186 },
  { id: 'volcanic', name: 'Igneous rocks', longitude: 77.45432473, latitude: 18.44899614, elevation: -2569.756 },
]

export const JEZERO_SITES = [
  ...TRAVERSE_WAYPOINTS,
  // Sample reports give latitude/longitude; the marker uses the Mars reference
  // ellipsoid because no measured terrain elevation is included in this data.
  ...PERSEVERANCE_SAMPLE_SITES.map(site => ({ ...site, elevation: 0 })),
]
