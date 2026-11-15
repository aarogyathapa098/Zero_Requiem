import { cellCenterToWorld, cellToLonLat } from '../../marsGrid/coords.js'
import { indexToGlobalCell } from './field.js'

/** Convert local path indices into map-ready global cells and lon/lat points. */
export function pathToLonLat(field, path) {
  return path.map(index => {
    const cell = indexToGlobalCell(field, index)
    const lonLat = cellToLonLat(cell.row, cell.col, {
      transform: field.transform,
      radius: field.radius,
      standardParallelDegrees: field.standardParallelDegrees,
    })
    const center = cellCenterToWorld(cell.row, cell.col, field.transform)
    return {
      row: cell.row,
      col: cell.col,
      lon: lonLat.lon,
      lat: lonLat.lat,
      world: { x: center.x, y: center.y },
    }
  })
}
