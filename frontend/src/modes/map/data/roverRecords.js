/**
 * Scattered Perseverance Rover Records, Scrap Metal Salvage, and Field Supplies.
 * Includes the 14 NASA archival items presented as weathered field chronicles
 * alongside their exact historical facts and official NASA reference links.
 */

export const ROVER_RECORDS = [
  {
    id: 'nssdca',
    number: '01',
    category: 'NASA Data & Resources',
    title: 'NASA Space Science Data Coordinated Archive (NSSDCA)',
    subtitle: 'Master Registry of Deep-Space Artifacts · Goddard Space Flight Center',
    edition: 'SOLAR ARCHIVE DISPATCH · VOL. I',
    url: 'https://nssdc.gsfc.nasa.gov/',
    x: 2025,
    y: 1025,
    story:
      'The edges of this torn printout are singed by atmospheric entry, yet the stamped header from Goddard Space Flight Center remains legible. Before Perseverance ever touched the red dust of Jezero, every bolt, lens, and radioisotope core launched by humankind was inscribed into one grand ledger: the NSSDCA. Whenever a probe goes silent on a distant moon or drifts beyond the heliosphere, archivists record its final coordinates here—turning cold telemetry into a map of humanity’s footsteps across the cosmos.',
    fact:
      "The NSSDCA is NASA's definitive, publicly available catalog. Participants can use it to search for any spacecraft or instrument sent into space, retrieve its mission parameters, and learn exactly what its final resting place and operational status is.",
  },
  {
    id: 'apollo-lm',
    number: '02',
    category: 'The Moon',
    title: 'Apollo Lunar Modules',
    subtitle: 'Sea of Tranquility & Lunar Highlands · 1969–1972',
    edition: 'LUNAR HERITAGE GAZETTE · ISSUE 11',
    url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C',
    x: 1945,
    y: 995,
    story:
      'Pinned beneath a jagged shard of rover aluminum lies a faded clipping showing a four-legged golden spider resting on gray regolith. When Neil Armstrong and Buzz Aldrin blasted off from Tranquility Base, Eagle’s octagonal descent stage stayed behind—its Kapton foil gleaming in airless sunlight as an improvised launch pad. Six such metallic pedestals still stand across the Moon today, bearing engraved plaques and waiting in vacuum silence for the next generation of explorers.',
    fact:
      "The descent stages of the Lunar Modules (like Apollo 11's Eagle) were left behind as launch pads.",
  },
  {
    id: 'apollo-lrv',
    number: '03',
    category: 'The Moon',
    title: 'Lunar Roving Vehicles (LRVs)',
    subtitle: 'Hadley-Apennine, Descartes & Taurus-Littrow · 1971–1972',
    edition: 'LUNAR HERITAGE GAZETTE · ISSUE 15',
    url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C',
    x: 1836,
    y: 984,
    nearScrapSlot: 0,
    story:
      'Found right beside Creature #1’s chewed wheel cleats, this greased schematic compares Perseverance’s bogie wheels to their wire-mesh ancestors on the Moon. On Apollo 15, 16, and 17, astronauts unfolded three featherweight electric "moon buggies" from the sides of their landers and drove across craters and rilles. Before lifting off for Earth, each crew parked their rover with its television camera pointed back at the lander—so the buggies could watch their drivers ascend into the black sky one last time.',
    fact:
      'Three electric "moon buggies" driven by astronauts. Parked permanently on the Moon.',
  },
  {
    id: 'alsep',
    number: '04',
    category: 'The Moon',
    title: 'ALSEP Scientific Packages',
    subtitle: 'Autonomous Lunar Surface Observatories · 1969–1977',
    edition: 'SEISMIC CHRONICLE · SUPPLEMENT IV',
    url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C',
    x: 1720,
    y: 875,
    story:
      'A half-buried telemetry strip flutters against a basalt stone. Long after the Apollo boots stopped kicking up lunar dust, the instruments they wired across the regolith kept whispering back to Earth. Powered by nuclear radioisotope heaters through two-week lunar nights, ALSEP seismometers felt the Moon ring like a bell from meteoroid strikes, while laser retroreflectors still bounce photons back to Earth observatories to this very second.',
    fact:
      'Apollo Lunar Surface Experiments Packages (seismometers, retroreflectors, etc.) left to do science after astronauts departed.',
  },
  {
    id: 'surveyor',
    number: '05',
    category: 'The Moon',
    title: 'Surveyor Landers',
    subtitle: 'Oceanus Procellarum · 1966–1968',
    edition: 'PIONEER VANGUARD PRESS · ARCHIVE 3',
    url: 'https://science.nasa.gov/mission/surveyor-3/',
    x: 1554,
    y: 804,
    nearScrapSlot: 1,
    story:
      'Tucked under a strip of gold thermal foil at the second scrap site is a photograph of astronaut Pete Conrad standing beside a squat, three-legged robot on the Moon. In the 1960s, nobody knew if a spacecraft would sink into deep lunar dust—until the robotic Surveyor probes proved soft landings were possible. Two and a half years after Surveyor 3 fell silent in a shallow crater, Apollo 12 landed within walking distance and brought its camera back to Earth.',
    fact:
      'Robotic probes sent in the 1960s to prove soft landings were possible.',
  },
  {
    id: 'sojourner',
    number: '06',
    category: 'Mars',
    title: 'Sojourner Rover',
    subtitle: 'Ares Vallis Floodplain · Mars Pathfinder (1997)',
    edition: 'RED PLANET DISPATCH · SOL 83',
    url: 'https://science.nasa.gov/mission/mars-pathfinder/',
    x: 1465,
    y: 670,
    story:
      'Stained with iron oxide, this dispatch celebrates the microwave-sized trailblazer that started every Martian drive that followed. In July 1997, airbags bounced across Ares Vallis and unfolded like petals to release six-wheeled Sojourner. Designed for just seven sols, the little rover spent 83 sols sniffing rocks like "Yogi" and "Barnacle Bill" before Pathfinder’s base station went quiet—leaving Sojourner parked forever near its lander.',
    fact:
      'The first rover on Mars (1997), delivered by the Pathfinder lander. Now permanently parked.',
  },
  {
    id: 'spirit-opportunity',
    number: '07',
    category: 'Mars',
    title: 'Spirit & Opportunity',
    subtitle: 'Gusev Crater & Meridiani Planum · 2004–2018',
    edition: 'MER FIELD JOURNAL · FINAL TRANSMISSION',
    url: 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/',
    x: 1330,
    y: 568,
    nearScrapSlot: 2,
    story:
      'Next to the third pile of gnawed rover brackets lies a poignant log entry bordered in black ink. Built for a 90-sol warranty, the twin rovers Spirit and Opportunity rewrote planetary history across years of relentless dust storms. Spirit fought through soft sand at Troy in Gusev Crater until the winter of 2010; Opportunity drove a marathon 45 kilometers to Perseverance Valley before a planet-encircling dust storm dimmed the sky in 2018.',
    fact:
      'Twin rovers that operated for years. Both are now inactive monuments to Mars exploration.',
  },
  {
    id: 'viking',
    number: '08',
    category: 'Mars',
    title: 'Viking 1 & 2 Landers',
    subtitle: 'Chryse Planitia & Utopia Planitia · 1976',
    edition: 'MARS SURFACE CHRONICLE · VOL. 1976',
    url: 'https://science.nasa.gov/mission/viking-1/',
    x: 1150,
    y: 562,
    story:
      'The ink on this brittle sheet dates back to the first summer humanity ever saw the Martian horizon from the ground. In 1976, Viking 1 and Viking 2 fired their terminal descent engines, settled onto dusty plains strewn with volcanic boulders, and scooped up red soil to test for microbial life. For over six Earth years Viking 1 watched frost form and fade—and both broad-shouldered landers still sit exactly where their footpads first pressed into Mars.',
    fact:
      'The first U.S. landers to successfully operate on Mars (1976), remaining exactly where they touched down.',
  },
  {
    id: 'phoenix-insight',
    number: '09',
    category: 'Mars',
    title: 'Phoenix & InSight Landers',
    subtitle: 'Vastitas Borealis & Elysium Planitia · 2008 / 2018',
    edition: 'SUBSURFACE TELEMETRY BULLETIN · #09',
    url: 'https://science.nasa.gov/mission/insight/',
    x: 928,
    y: 594,
    nearScrapSlot: 3,
    story:
      'Wedged beneath a dented filter plate at the fourth creature site, this dual mission dossier tells the story of two stationary listeners. Far in the Martian arctic, Phoenix scraped away top-soil in 2008 to expose gleaming white water ice before polar darkness froze its solar arrays. A decade later on Elysium Planitia, InSight pressed its dome-shielded seismometer against the ground and recorded over 1,300 marsquakes before dust gently blanketed its wings.',
    fact:
      'Phoenix dug for water ice; InSight listened for marsquakes. Both eventually lost power.',
  },
  {
    id: 'dawn',
    number: '10',
    category: 'Mars',
    title: 'Dawn Spacecraft',
    subtitle: 'Main Asteroid Belt · Vesta & Dwarf Planet Ceres',
    edition: 'DEEP BELT NAVIGATION LOG · ORBIT ∞',
    url: 'https://science.nasa.gov/mission/dawn/',
    x: 845,
    y: 735,
    story:
      'A blue-tinted ion-propulsion chart shows a spacecraft spiraling between two ancient worlds beyond Mars. Propelled by xenon ion thrusters glowing like faint blue starlight, Dawn became the only craft ever to orbit two extraterrestrial destinations—first the battered protoplanet Vesta, then icy dwarf planet Ceres. When its hydrazine attitude fuel ran dry in 2018, engineers placed Dawn in a stable quarantine orbit where it circles Ceres for eternity.',
    fact:
      'Mapped Vesta and Ceres. Ran out of fuel and remains in a perpetual, unpowered orbit around Ceres.',
  },
  {
    id: 'near-shoemaker',
    number: '11',
    category: 'Mars',
    title: 'NEAR Shoemaker',
    subtitle: 'Asteroid 433 Eros · February 2001',
    edition: 'ASTEROID FRONTIER PRESS · EROS EDITION',
    url: 'https://science.nasa.gov/mission/near-shoemaker/',
    x: 712,
    y: 912,
    nearScrapSlot: 4,
    story:
      'Beside the fifth scrap-metal site, a crumpled flight transcript recounts an improvised finale no one thought a non-lander could survive. After spending a year mapping the peanut-shaped asteroid 433 Eros from orbit, NEAR Shoemaker was nearly out of propellant. Mission controllers fired a series of delicate braking burns to bring the orbiter down at walking speed—touching down intact on the asteroid’s blocky surface, where it still rides Eros around the Sun.',
    fact:
      'First spacecraft to orbit and land on an asteroid. Left resting on the surface of 433 Eros.',
  },
  {
    id: 'pioneer',
    number: '12',
    category: 'Mars',
    title: 'Pioneer 10 & 11',
    subtitle: 'Outer Solar System & Interstellar Trajectories · 1972–1973',
    edition: 'INTERSTELLAR HERALD · PLAQUE ARCHIVE',
    url: 'https://science.nasa.gov/mission/pioneer-10/',
    x: 655,
    y: 985,
    story:
      'Etched into the margin of this weathered page is a reproduction of the famous gold-anodized aluminum plaque—two human figures and a pulsar map pointing back to Earth. Pioneer 10 and 11 were the first scouts to thread the Asteroid Belt and brave Jupiter’s fierce radiation belts, with Pioneer 11 sweeping past Saturn’s rings. Long past their last faint radio ping, both couriers coast silently toward the stars.',
    fact:
      'Early deep-space probes that explored the outer planets. Now drifting silently out of the solar system.',
  },
  {
    id: 'ingenuity',
    number: '13',
    category: 'Mars',
    title: 'Ingenuity Helicopter',
    subtitle: 'Wright Brothers Field to Valinor Hills · Jezero Crater',
    edition: 'JEZERO FLIGHT LOG · FLIGHT 72',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/',
    x: 548,
    y: 1090,
    nearScrapSlot: 5,
    story:
      'Right here in Jezero Crater, just one ridge away from Perseverance, lies a rotorcraft logbook with carbon-fiber weave marks on the cover. Built as a 5-flight technology demo in an atmosphere only 1% as thick as Earth’s, four-pound "Ginny" soared 72 times as Perseverance’s aerial scout over Neretva Vallis. After a hard landing in sandy ripples clipped its rotor blades on Flight 72, Ingenuity stood upright in Valinor Hills as an enduring aviation monument.',
    fact:
      'The first aircraft on another planet. Sustained rotor damage and became a stationary artifact.',
  },
  {
    id: 'kepler',
    number: '14',
    category: 'Mars',
    title: 'Kepler Space Telescope',
    subtitle: 'Heliocentric Earth-Trailing Orbit · 2009–2018',
    edition: 'EXOPLANET OBSERVATORY GAZETTE · FINAL LOG',
    url: 'https://science.nasa.gov/mission/kepler/',
    x: 382,
    y: 1118,
    story:
      'Resting right beside the main Perseverance Rover is the final page of the archive—a star chart crowded with thousands of circled suns. For nine years, the Kepler Space Telescope stared unblinking at patches of sky, catching the tiny dip of starlight whenever an alien world crossed in front of its sun and proving that planets outnumber stars in our galaxy. Out of fuel in 2018, its transmitter was commanded off as it drifts peacefully in an orbit trailing Earth.',
    fact:
      'Revolutionary exoplanet-hunting telescope that ran out of fuel and is drifting in an Earth-trailing orbit.',
  },
]

/**
 * Collectible Scrap Metal pieces shed by Perseverance at the 6 creature sites
 * plus 2 bonus salvage fragments near the rover.
 */
export const SCRAP_PICKUPS = [
  {
    id: 'scrap-1',
    slot: 0,
    name: 'Titanium Wheel Cleat',
    weight: '1.4 kg',
    grade: 'Ti-6Al-4V Alloy',
    x: 1852,
    y: 954,
    description: 'Machined grouser cleat chewed loose from Perseverance’s starboard middle wheel.',
  },
  {
    id: 'scrap-2',
    slot: 1,
    name: 'Gold MLI Thermal Blanket Shard',
    weight: '0.3 kg',
    grade: 'Kapton-Au Foil',
    x: 1571,
    y: 774,
    description: 'Multi-layer gold-coated insulation foil torn from the rover’s warm electronics box.',
  },
  {
    id: 'scrap-3',
    slot: 2,
    name: 'Rocker-Bogie Strut Bracket',
    weight: '2.1 kg',
    grade: 'Aero-Grade Titanium',
    x: 1347,
    y: 540,
    description: 'Load-bearing differential pivot bracket with distinct creature bite marks.',
  },
  {
    id: 'scrap-4',
    slot: 3,
    name: 'MOXIE Intake Filter Plate',
    weight: '0.9 kg',
    grade: 'Sintered Stainless Mesh',
    x: 944,
    y: 564,
    description: 'HEPA atmospheric dust filter housing from the oxygen ISRU experiment.',
  },
  {
    id: 'scrap-5',
    slot: 4,
    name: 'SuperCam Calibration Target Fragment',
    weight: '0.6 kg',
    grade: 'Anodized Aluminum',
    x: 728,
    y: 882,
    description: 'Color and mineral calibration plate pried off the rover deck aft bracket.',
  },
  {
    id: 'scrap-6',
    slot: 5,
    name: 'Coring Drill Titanium Bit',
    weight: '1.8 kg',
    grade: 'Tungsten-Carbide Tip',
    x: 564,
    y: 1061,
    description: 'Rotary-percussive abrasion bit dropped from the turret adaptive caching assembly.',
  },
]

/**
 * Collectible EVA survival supplies (Food, Water, Oxygen) along the traverse.
 */
export const SUPPLY_PICKUPS = [
  {
    id: 'supply-food-1',
    kind: 'food',
    name: 'EVA High-Calorie Ration Bar',
    restore: 30,
    x: 1990,
    y: 1005,
    description: 'Thermostabilized nutrient bar (+30 Hunger).',
  },
  {
    id: 'supply-water-1',
    kind: 'water',
    name: 'Electrolyte H₂O Foil Pouch',
    restore: 35,
    x: 1775,
    y: 915,
    description: 'Pressurized drink pouch with straw valve (+35 Water).',
  },
  {
    id: 'supply-food-2',
    kind: 'food',
    name: 'Freeze-Dried Berry & Oat Pack',
    restore: 30,
    x: 1495,
    y: 725,
    description: 'Standard NASA long-duration EVA ration (+30 Hunger).',
  },
  {
    id: 'supply-water-2',
    kind: 'water',
    name: 'Recycled Condensate H₂O Cell',
    restore: 35,
    x: 1245,
    y: 575,
    description: 'Filtered portable hydration cartridge (+35 Water).',
  },
  {
    id: 'supply-o2-1',
    kind: 'oxygen',
    name: 'MOXIE Reserve O₂ Canister',
    restore: 35,
    x: 1045,
    y: 580,
    description: 'Compressed breathable oxygen cylinder (+35 O₂).',
  },
  {
    id: 'supply-food-3',
    kind: 'food',
    name: 'Protein & Glucose Gel Tube',
    restore: 30,
    x: 805,
    y: 810,
    description: 'Rapid-absorption suit feed tube (+30 Hunger).',
  },
  {
    id: 'supply-water-3',
    kind: 'water',
    name: 'Emergency Reserve H₂O Pouch',
    restore: 35,
    x: 625,
    y: 1020,
    description: 'Insulated glacial-melt hydration pack (+35 Water).',
  },
]
