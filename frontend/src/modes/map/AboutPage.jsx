import { ArrowLeft, ArrowUpRight, Compass, Globe2, Layers3, Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import './aboutPage.css'

const sources = [
  ['NASA Mars Trek API', 'https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars'],
  ['NASA Mars Trek viewer', 'https://trek.nasa.gov/mars/'],
  ['USGS SIM 3464 geology', 'https://pubs.usgs.gov/publication/sim3464'],
  ['USGS planetary names', 'https://planetarynames.wr.usgs.gov/'],
  ['Perseverance mission', 'https://science.nasa.gov/mission/mars-2020-perseverance/'],
  ['Perseverance rover map', 'https://mars.nasa.gov/mars2020/mission/where-is-the-rover/'],
  ['Curiosity mission', 'https://science.nasa.gov/mission/msl-curiosity/'],
  ['CesiumJS', 'https://cesium.com/platform/cesiumjs/'],
]

export default function AboutPage() {
  return <main className="about-page">
    <header className="about-header"><Link to="/"><ArrowLeft size={17} /> Back to Mars map</Link><strong>S.U.N.A IV</strong><span>NASA Space Apps concept</span></header>
    <div className="about-content">
      <h1>How the Mars map works.</h1>
      <p className="about-lead">S.U.N.A IV brings planetary imagery, geology, rover journeys, and Jezero’s story into one explorable map. This page explains where each layer comes from and how it appears on screen.</p>
      <section><Globe2 /><div><h2>Cesium and the 3D globe</h2><p>CesiumJS draws the globe with the Mars ellipsoid. A local Mars surface texture gives the globe its natural appearance. When you choose MOLA Elevation, the app requests color shaded elevation tiles from NASA Mars Trek and drapes them over the globe. Regional CTX and HiRISE imagery appears where NASA provides coverage. Camera controls let you rotate, zoom, and fly to named locations. The atmospheric glow and lighting are visual simulations.</p></div></section>
      <section><Layers3 /><div><h2>Jezero’s 2D map and raster layers</h2><p>The Jezero view combines a 20 m CTX digital elevation model rendered as shaded relief with regional orbital imagery. Its optional USGS SIM 3464 overlay shows mapped geologic units. The layer legend identifies the active raster and source; geologic boundaries can differ from rover imagery by roughly 100–200 m. Place names and Jezero’s formation story link to the USGS Gazetteer and NASA resources.</p></div></section>
      <section><Compass /><div><h2>Rover models and locations</h2><p>The Perseverance and Curiosity models are 3D GLB assets loaded into the map near their mission regions. They are visual markers for the journeys, not live telemetry. The rover cards link to official mission pages and maps so you can inspect the real missions behind the display.</p></div></section>
      <section><Route /><div><h2>Paths and stories</h2><p>Bundled traverse data defines the lines and waypoints displayed for rover journeys. The app converts each longitude and latitude pair to a position on the Mars globe, then connects them in sequence. The Perseverance and Curiosity journeys represent rover records; Mark Watney’s route is identified as fictional. Selecting a journey focuses the camera and opens a story panel with its source link.</p></div></section>
      <section className="about-sources"><div><h2>Explore the sources</h2><p>Each external link opens the original dataset, mission page, or mapping tool in a new tab.</p><div className="about-links">{sources.map(([label,url]) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={16} /></a>)}</div></div></section>
      <p className="about-footnote">Independent concept prototype for NASA Space Apps. Planet scale, atmosphere thickness, and lighting are illustrative.</p>
    </div>
  </main>
}
