import { CAMP, getActiveTargetCreature, MAP_SIZE, PERSEVERANCE_ROVER, SCAN_RANGES, SITES, SPECIES } from './marsModel'
import { PERSEVERANCE_PATH } from './marsTraverse.js'
import { CHARACTERS } from '../../game/data/characters.js'
import astroIdleSrc from '../../game/assets/sprites/astros/idle1.png'
import astroRun1Src from '../../game/assets/sprites/astros/run1.png'
import astroRun2Src from '../../game/assets/sprites/astros/run2.png'
import astroRun3Src from '../../game/assets/sprites/astros/run3.png'
import astroRun4Src from '../../game/assets/sprites/astros/run4.png'
import astroRun5Src from '../../game/assets/sprites/astros/run5.png'
import astroRun6Src from '../../game/assets/sprites/astros/run6.png'

function loadSprite(src) {
  if (typeof Image === 'undefined') return null
  const img = new Image()
  img.src = src
  return img
}

const astroIdleImg = loadSprite(astroIdleSrc)
const astroRunImgs = [astroRun1Src, astroRun2Src, astroRun3Src, astroRun4Src, astroRun5Src, astroRun6Src].map(loadSprite)

const silhouetteSprites = new Map(
  CHARACTERS.map(character => [character.id, loadSprite(character.silhouette)])
)
const characterSprites = new Map(
  CHARACTERS.map(character => [character.id, loadSprite(character.character)])
)

function randomSeed(seed = 2708) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
}

function contour(ctx, x, y, radius, stretch, seed, fill) {
  ctx.beginPath()
  for (let i = 0; i <= 80; i++) {
    const angle = i / 80 * Math.PI * 2
    const r = radius * (1 + Math.sin(angle * 3 + seed) * 0.07 + Math.cos(angle * 7) * 0.025)
    const px = x + Math.cos(angle) * r
    const py = y + Math.sin(angle) * r * stretch
    if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  ctx.stroke()
}

export function createTerrain() {
  const canvas = document.createElement('canvas')
  canvas.width = MAP_SIZE.width; canvas.height = MAP_SIZE.height
  const ctx = canvas.getContext('2d')
  const random = randomSeed()
  ctx.fillStyle = '#a46649'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  // A synthetic topographic play area, rather than a geographic basemap.
  for (let y = 0; y < canvas.height; y += 18) for (let x = 0; x < canvas.width; x += 18) {
    const h = Math.sin(x / 280 + Math.sin(y / 330)) + Math.cos(y / 190 + x / 500)
    ctx.fillStyle = h > 1 ? '#ac7050' : h < -1 ? '#9d6045' : '#a56a4a'
    ctx.fillRect(x, y, 18, 18)
  }
  // Dry lake basin and sediment terraces; no modern lake is depicted.
  ctx.lineWidth = 2; ctx.strokeStyle = '#765d4d75'
  contour(ctx, 930, 680, 330, 0.62, 32, '#938475')
  for (let r = 300; r >= 50; r -= 35) contour(ctx, 930, 680, r, 0.62, 32, r === 300 ? '#9e9180' : null)
  ctx.strokeStyle = '#b8ad9460'; ctx.lineWidth = 3
  for (let r = 270; r > 50; r -= 55) contour(ctx, 930, 680, r, 0.62, 32)
  // Branching, fossil channels feed the basin from the northwest.
  ctx.lineCap = 'round'
  for (const offset of [-100, -50, 0, 60, 110]) {
    ctx.beginPath(); ctx.moveTo(370 + offset, 220); ctx.bezierCurveTo(510, 460 + offset, 680 + offset, 380, 910, 650 + offset)
    ctx.strokeStyle = '#776b5c'; ctx.lineWidth = 17; ctx.stroke()
    ctx.strokeStyle = '#b2a18a'; ctx.lineWidth = 7; ctx.stroke()
  }
  // A compressed rim ridge with nested elevation contours.
  ctx.strokeStyle = '#744a38'; ctx.lineWidth = 3
  for (let r = 440; r >= 50; r -= 27) {
    const shade = Math.round(140 + (440 - r) * 0.13)
    contour(ctx, 1790, 380, r, 0.68, 7, `rgb(${shade + 28},${shade - 19},${shade - 52})`)
  }
  ctx.strokeStyle = '#e2bd8940'; ctx.lineWidth = 1.5
  for (let r = 420; r >= 60; r -= 27) contour(ctx, 1790, 377, r, 0.68, 7)
  // Old impact craters, kept shallow enough for a freely walkable prototype.
  for (const [x, y, r] of [[470, 1290, 185], [1930, 1280, 255], [500, 650, 95], [1250, 1520, 85], [2070, 770, 90]]) {
    ctx.strokeStyle = '#6a45354a'; ctx.lineWidth = 13; contour(ctx, x + 8, y + 10, r, 0.72, 3, '#935e45')
    ctx.strokeStyle = '#d2a175'; ctx.lineWidth = 9; contour(ctx, x - 4, y - 4, r, 0.72, 3)
    ctx.strokeStyle = '#80533b'; ctx.lineWidth = 2; contour(ctx, x, y, r * 0.8, 0.72, 3)
  }
  // Subtle Perseverance wheel ruts etched into the regolith along its traverse
  if (PERSEVERANCE_PATH.length > 1) {
    ctx.save()
    ctx.strokeStyle = '#5d3e2f42'
    ctx.lineWidth = 5
    ctx.setLineDash([7, 6])
    ctx.beginPath()
    PERSEVERANCE_PATH.forEach(({ x, y }, index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
    ctx.strokeStyle = '#dfb78c28'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }
  // Wind-carved streaks and scattered surface stones.
  for (let i = 0; i < 950; i++) {
    const x = random() * canvas.width; const y = random() * canvas.height
    ctx.strokeStyle = random() > 0.5 ? '#e8be8f17' : '#50362917'; ctx.lineWidth = 1 + random() * 2
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + random() * 18, y - 3 - random() * 5); ctx.stroke()
  }
  for (let i = 0; i < 230; i++) {
    const x = random() * canvas.width; const y = random() * canvas.height; const r = 3 + random() * 8
    ctx.fillStyle = '#543b2c38'; ctx.beginPath(); ctx.ellipse(x + 4, y + 5, r * 1.4, r * 0.65, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = random() > 0.6 ? '#6d5b52' : '#b58b68'; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.4, y - r); ctx.lineTo(x + r * 0.7, y - r * 0.8); ctx.lineTo(x + r, y + 1); ctx.lineTo(x, y + r * 0.4); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#dec29b55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.4, y - r); ctx.lineTo(x + r * 0.7, y - r * 0.8); ctx.stroke()
  }
  ctx.fillStyle = '#432f27'; ctx.font = '600 18px Manrope, sans-serif'; ctx.globalAlpha = 0.45
  ctx.fillText('ILLUSTRATED JEZERO TRAVERSE', 720, 150)
  ctx.font = '12px Manrope, sans-serif'; ctx.fillText('ANCIENT BASIN', 850, 810); ctx.fillText('CRATER HIGHLANDS', 1710, 190); ctx.fillText('SOUTHERN REGOLITH', 1430, 1620)
  ctx.globalAlpha = 1
  return canvas
}

const astronaut = [
  '....WWWW....', '...WLLLLW...', '..WLLVLLLW..', '..WLVVVVLW..', '..WLVVVVLW..', '...WLLLLW...', '....WWWW....', '..WWOOOOHH..', '.WWHWOOWHHH.', '.WWHWWWW.HH.', '.WW.WWWW.HH.', '....WWWW....', '....W..W....', '...WW..WW...', '...DD..DD...',
]
const legacyCreatures = {
  dustling: ['....CC....','...CCCC...','..CCLCCC..','.CCCCCCCC.','CCBCCCBCCC','CCBCCCBCCC','.CCCCCCCC.','..CCDDCC..','.CC....CC.','..C....C..'],
  ferrite: ['...DDDD...','..DCCCCD..','.DCLCCCCD.','DCCCCCCCCD','DCCBCCBCCD','.DCCCCCCD.','..DCCCCD..','..DCDCCD..','.DD....DD.'],
  glimmer: ['....L.....','...LCL....','..LCCCL...','.DCCCCCD..','DCCCCCCCD.','.CBCCBCC..','..CCCCCC..','...DCCD...','..DD..DD..'],
}

export function drawSprite(ctx, kind, x, y, scale = 3, moving = false, time = 0, facing = 1) {
  if (kind === 'astronaut') {
    const frameImg = moving
      ? astroRunImgs[Math.floor(time * 12) % astroRunImgs.length]
      : astroIdleImg
    if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
      const drawHeight = 18 * scale
      const drawWidth = drawHeight * (frameImg.naturalWidth / frameImg.naturalHeight)
      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.translate(Math.round(x), Math.round(y))
      ctx.scale(facing < 0 ? -1 : 1, 1)
      ctx.drawImage(frameImg, -drawWidth / 2, -drawHeight, drawWidth, drawHeight)
      ctx.restore()
      return
    }
  }
  const rows = kind === 'astronaut' ? astronaut : legacyCreatures[kind] || legacyCreatures.dustling
  const species = SPECIES.find(s => s.id === kind)
  const palette = { W: '#ebe8d9', L: '#e1dec8', V: '#304c61', O: '#dc8c57', H: '#899b9a', D: species?.dark || '#464b4d', C: species?.color || '#d4b682', B: '#253541' }
  if (kind === 'glimmer') palette.L = '#e1f9e5'
  const width = rows[0].length * scale; const height = rows.length * scale
  ctx.fillStyle = '#332b2745'; ctx.beginPath(); ctx.ellipse(x + 3, y + 5, width * 0.48, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.imageSmoothingEnabled = false
  rows.forEach((row, iy) => [...row].forEach((pixel, ix) => {
    if (pixel === '.') return
    ctx.fillStyle = palette[pixel]
    const step = kind === 'astronaut' && moving && iy >= 12 ? (ix < 6 ? 1 : -1) * Math.sin(time * 14) * 2 : 0
    ctx.fillRect(Math.round(x - width / 2 + ix * scale), Math.round(y - height + iy * scale + step), scale, scale)
  }))
}

/**
 * Draws a pile of shed Perseverance Rover scrap metal (torn gold thermal foil,
 * riveted chassis panels, broken wheel tread, wires, and crunch sparks when eaten).
 */
function drawRoverScrapPile(ctx, x, y, slot, feasting, scanned, time, reducedMotion) {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))

  // Disturbed Martian regolith shadow beneath scrap metal
  ctx.fillStyle = '#3a241a66'
  ctx.beginPath()
  ctx.ellipse(0, 4, 21, 9.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Broken cleated rover wheel tread fragment
  ctx.save()
  ctx.rotate(-0.35 + (slot % 3) * 0.22)
  ctx.fillStyle = '#292f35'
  ctx.strokeStyle = '#6f7982'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.roundRect(-16, -3, 13, 7, 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#9aa4ad'
  for (let gx = -13; gx <= -6; gx += 3.5) {
    ctx.beginPath()
    ctx.moveTo(gx, -2.5)
    ctx.lineTo(gx, 3.5)
    ctx.stroke()
  }
  ctx.restore()

  // Bent white-painted rover hull plate with rivets
  ctx.save()
  ctx.rotate(0.24 - (slot % 2) * 0.3)
  ctx.fillStyle = '#ddd7cb'
  ctx.strokeStyle = '#5a6066'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-4, -7)
  ctx.lineTo(13, -5)
  ctx.lineTo(10, 5)
  ctx.lineTo(-6, 3)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#c85a3a'
  ctx.fillRect(0, -3, 7, 2)
  ctx.fillStyle = '#4e555b'
  ctx.fillRect(-2, -4, 1.8, 1.8)
  ctx.fillRect(8, 1, 1.8, 1.8)
  ctx.restore()

  // Crinkled gold MLI thermal blanket shard
  ctx.save()
  ctx.translate(4, 3)
  ctx.rotate(0.5)
  ctx.fillStyle = '#dfa332'
  ctx.strokeStyle = '#fbe094'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-7, -3)
  ctx.lineTo(2, -6)
  ctx.lineTo(7, 1)
  ctx.lineTo(-2, 5)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Snapped copper / sensor wire
  ctx.strokeStyle = '#d96b43'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(-9, 4)
  ctx.quadraticCurveTo(-4, 9, 2, 6)
  ctx.stroke()

  // Metallic glint & feasting crunch sparks when creature is eating the scrap
  if (feasting && !scanned && !reducedMotion) {
    const chompPulse = (time * 4.2 + slot) % 1
    ctx.strokeStyle = `rgba(255, 226, 150, ${(1 - chompPulse) * 0.75})`
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(0, 0, 6 + chompPulse * 13, 0, Math.PI * 2)
    ctx.stroke()

    for (let i = 0; i < 4; i++) {
      const sparkTime = (time * 3.6 + i * 0.25 + slot * 0.4) % 1
      const angle = -Math.PI * 0.85 + i * 0.58 + Math.sin(slot + i) * 0.2
      const dist = 4 + sparkTime * 16
      const sx = Math.cos(angle) * dist
      const sy = Math.sin(angle) * dist - sparkTime * 5
      ctx.fillStyle = i % 2 === 0
        ? `rgba(255, 230, 142, ${1 - sparkTime})`
        : `rgba(222, 235, 245, ${1 - sparkTime})`
      ctx.fillRect(sx - 1.5, sy - 1.5, 2.8, 2.8)
    }
  }

  ctx.restore()
}

/**
 * Draws the damaged Perseverance Rover at the end of the scrap trail.
 */
function drawPerseveranceRover(ctx, x, y, allScanned, time, reducedMotion) {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))

  // Ground shadow & scattered scrap around the rover
  ctx.fillStyle = '#2d1c1478'
  ctx.beginPath()
  ctx.ellipse(2, 12, 42, 18, 0, 0, Math.PI * 2)
  ctx.fill()

  drawRoverScrapPile(ctx, 34, 15, 7, false, true, time, reducedMotion)
  drawRoverScrapPile(ctx, -32, 17, 9, false, true, time, reducedMotion)

  // Highlight beacon ring once all 6 creatures are scanned
  if (allScanned && !reducedMotion) {
    const pulse = (time % 1.8) / 1.8
    ctx.strokeStyle = `rgba(140, 240, 210, ${(1 - pulse) * 0.7})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(0, 6, 38 + pulse * 22, 18 + pulse * 10, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Rocker-bogie suspension struts & 6 wheels
  ctx.strokeStyle = '#333a42'
  ctx.lineWidth = 2.6
  for (const wx of [-24, 0, 24]) {
    ctx.beginPath()
    ctx.moveTo(wx, -2)
    ctx.lineTo(wx, 13)
    ctx.stroke()

    ctx.fillStyle = '#23282e'
    ctx.strokeStyle = '#8b959e'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.roundRect(wx - 7, 9, 14, 8, 2.5)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#333a42'
    ctx.lineWidth = 2.6
  }

  // Rear angled MMRTG power source
  ctx.save()
  ctx.translate(25, -10)
  ctx.rotate(-0.32)
  ctx.fillStyle = '#cfc9bc'
  ctx.strokeStyle = '#555c63'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(-6, -8, 16, 14, 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#d4823f'
  ctx.fillRect(-2, -5, 8, 3)
  ctx.restore()

  // Main warm-electronics chassis box (with bite/scrap damage notch)
  ctx.fillStyle = '#eae4d7'
  ctx.strokeStyle = '#4c535a'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.roundRect(-24, -14, 46, 21, 3)
  ctx.fill()
  ctx.stroke()

  // Gold thermal deck accent & damaged dark compartment
  ctx.fillStyle = '#dda43b'
  ctx.fillRect(-19, -10, 24, 6)
  ctx.fillStyle = '#343940'
  ctx.beginPath()
  ctx.moveTo(9, -11)
  ctx.lineTo(19, -8)
  ctx.lineTo(15, 2)
  ctx.lineTo(6, -1)
  ctx.closePath()
  ctx.fill()

  // Front robotic turret arm
  ctx.strokeStyle = '#d7d1c4'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-23, -3)
  ctx.lineTo(-36, -8)
  ctx.lineTo(-41, 1)
  ctx.stroke()
  ctx.fillStyle = '#565f68'
  ctx.beginPath()
  ctx.arc(-42, 2, 4.5, 0, Math.PI * 2)
  ctx.fill()

  // Mastcam-Z vertical mast & camera head
  ctx.strokeStyle = '#e5dfd2'
  ctx.lineWidth = 3.2
  ctx.beginPath()
  ctx.moveTo(-13, -14)
  ctx.lineTo(-13, -34)
  ctx.stroke()

  ctx.fillStyle = '#f0ebe0'
  ctx.strokeStyle = '#495057'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(-21, -41, 16, 8, 2)
  ctx.fill()
  ctx.stroke()

  // Camera lens glint
  ctx.fillStyle = allScanned ? '#6ff7d8' : '#ff7b54'
  ctx.beginPath()
  ctx.arc(-16, -37, 2.1, 0, Math.PI * 2)
  ctx.fill()

  // Label plate underneath rover
  const roverLabel = allScanned ? '★ PERSEVERANCE ROVER' : 'PERSEVERANCE ROVER'
  ctx.font = '700 10px Manrope, sans-serif'
  const labelWidth = ctx.measureText(roverLabel).width
  ctx.fillStyle = '#1b2724e6'
  ctx.strokeStyle = allScanned ? '#8ef0d4aa' : '#ead9b866'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.roundRect(-labelWidth / 2 - 10, 24, labelWidth + 20, 21, 5)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = allScanned ? '#c9fff0' : '#f4e7cf'
  ctx.textAlign = 'center'
  ctx.fillText(roverLabel, 0, 38)
  ctx.textAlign = 'left'

  ctx.restore()
}

function drawTrailCreature(ctx, creature, isTarget, isNearby, time, reducedMotion) {
  const { x, y, scanned, feasting, facing, characterId, name, slot } = creature
  const sprite = scanned ? characterSprites.get(characterId) : silhouetteSprites.get(characterId)

  // Ground aura ring for unscanned / interactive creatures
  if (!scanned) {
    ctx.save()
    const pulse = reducedMotion ? 0.5 : (Math.sin(time * 4 + slot) + 1) * 0.5
    if (isNearby || isTarget) {
      ctx.strokeStyle = isNearby
        ? `rgba(255, 224, 130, ${0.55 + pulse * 0.4})`
        : `rgba(255, 198, 112, ${0.32 + pulse * 0.3})`
      ctx.fillStyle = isNearby ? 'rgba(255, 210, 110, 0.14)' : 'rgba(255, 184, 96, 0.07)'
      ctx.lineWidth = isNearby ? 2.2 : 1.5
      ctx.beginPath()
      ctx.ellipse(x, y - 2, isNearby ? 28 + pulse * 4 : 23, isNearby ? 13 + pulse * 2 : 10.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }

  // Contact shadow
  ctx.fillStyle = '#24160f66'
  ctx.beginPath()
  ctx.ellipse(x, y + 2, 16, 6.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Bob & nibble/chomp motion
  let bobY = 0
  let tilt = 0
  if (!reducedMotion) {
    if (feasting && !scanned) {
      // Quick eager nibbling motion toward the rover scrap pile
      const chomp = Math.abs(Math.sin(time * 8.2 + slot * 1.3))
      bobY = -chomp * 3.5
      tilt = (facing < 0 ? -1 : 1) * (0.06 + chomp * 0.1)
    } else {
      bobY = Math.sin(time * 4.8 + slot * 1.7) * 2.4
      tilt = Math.sin(time * 2.4 + slot) * 0.03
    }
  }

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    const drawHeight = scanned ? 50 : 56
    const drawWidth = drawHeight * (sprite.naturalWidth / sprite.naturalHeight)
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.translate(Math.round(x), Math.round(y + bobY))
    ctx.rotate(tilt)
    ctx.scale(facing < 0 ? -1 : 1, 1)
    if (!scanned) {
      ctx.shadowColor = isNearby ? 'rgba(255, 200, 95, 0.8)' : 'rgba(255, 145, 70, 0.45)'
      ctx.shadowBlur = isNearby ? 14 : 8
    }
    ctx.drawImage(sprite, -drawWidth / 2, -drawHeight, drawWidth, drawHeight)
    ctx.restore()
  } else {
    // Fallback silhouette marker while image finishes decoding
    ctx.save()
    ctx.fillStyle = scanned ? '#a5d8c9' : '#140c10'
    ctx.strokeStyle = '#ffd480'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y - 22 + bobY, 15, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (!scanned) {
      ctx.fillStyle = '#ffd480'
      ctx.font = '700 15px Manrope, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('?', x, y - 17 + bobY)
      ctx.textAlign = 'left'
    }
    ctx.restore()
  }

  // Tag below creature
  let label
  let textColor
  let borderColor
  if (scanned) {
    label = `✓ ${name}`
    textColor = '#c7f2d0'
    borderColor = '#7ec89266'
  } else if (isNearby) {
    label = '[E / CLICK] SCAN'
    textColor = '#ffe7a8'
    borderColor = '#ffd275cc'
  } else if (feasting) {
    label = '??? · EATING SCRAP'
    textColor = '#f5d9b0'
    borderColor = '#eab97855'
  } else {
    label = '??? · ROAMING'
    textColor = '#ebd4b7'
    borderColor = '#d8b89244'
  }

  ctx.save()
  ctx.font = isNearby && !scanned ? '700 10px Manrope, sans-serif' : '600 9.5px Manrope, sans-serif'
  const textW = ctx.measureText(label).width
  const boxW = textW + 14
  const boxH = 18
  const boxX = x - boxW / 2
  const boxY = y + 8
  ctx.fillStyle = isNearby && !scanned ? '#24140ee8' : '#261d19d8'
  ctx.strokeStyle = borderColor
  ctx.lineWidth = isNearby && !scanned ? 1.5 : 1
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, 9)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.fillText(label, x, boxY + 12.5)
  ctx.textAlign = 'left'
  ctx.restore()
}

function pin(ctx, site, discovered, nearest) {
  const { x, y } = site
  ctx.strokeStyle = discovered ? '#cce3bd' : '#efdbb8'; ctx.lineWidth = 1.5
  ctx.fillStyle = '#372e27'; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = site.color; ctx.lineWidth = 2
  ctx.beginPath()
  if (site.icon === 'mountain') { ctx.moveTo(x - 8, y + 5); ctx.lineTo(x, y - 7); ctx.lineTo(x + 8, y + 5); ctx.closePath() }
  else if (site.icon === 'lake') { for (let i = -1; i <= 1; i++) { ctx.moveTo(x - 7, y + i * 5); ctx.quadraticCurveTo(x - 3, y + i * 5 - 4, x + 1, y + i * 5); ctx.quadraticCurveTo(x + 5, y + i * 5 + 4, x + 8, y + i * 5) } }
  else { ctx.moveTo(x - 7, y + 5); ctx.lineTo(x - 5, y - 4); ctx.lineTo(x + 2, y - 7); ctx.lineTo(x + 8, y + 3); ctx.closePath() }
  ctx.stroke()
  if (nearest) { ctx.strokeStyle = '#fff1d980'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI * 2); ctx.stroke() }
  const label = `${discovered ? '✓ ' : ''}${site.name}`
  ctx.font = '600 11px Manrope, sans-serif'; const width = ctx.measureText(label).width
  ctx.fillStyle = '#302b27d9'; ctx.fillRect(x - width / 2 - 10, y + 25, width + 20, 24)
  ctx.textAlign = 'center'; ctx.fillStyle = discovered ? '#d4e6bf' : '#f1e5cd'; ctx.fillText(label, x, y + 41); ctx.textAlign = 'left'
}

function questDiamond(ctx, x, y, radius, time, reducedMotion, accent = '#f3b77e') {
  ctx.save()
  ctx.translate(x, y)
  if (!reducedMotion) {
    const phase = time % 1.6 / 1.6
    ctx.strokeStyle = `rgba(255,233,189,${(1 - phase) * .7})`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(0, 0, radius + 5 + phase * 16, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.fillStyle = '#24352fe8'; ctx.strokeStyle = '#fff5df'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, -radius); ctx.lineTo(radius * .78, 0); ctx.lineTo(0, radius); ctx.lineTo(-radius * .78, 0); ctx.closePath()
  ctx.fill(); ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath(); ctx.moveTo(0, -radius * .55); ctx.lineTo(radius * .43, 0); ctx.lineTo(0, radius * .55); ctx.lineTo(-radius * .43, 0); ctx.closePath(); ctx.fill()
  ctx.restore()
}

export function renderMap(ctx, terrain, state, creatures, camera, size, target, time, moving, reducedMotion, wind, showLandingMarker = false, routeOverview = false, showSites = false, facing = 1, nearbySlot = -1) {
  const { width, height, scale, dpr } = size
  const creatureList = creatures || []
  const targetCreature = getActiveTargetCreature(creatureList)
  const allScanned = creatureList.length > 0 && !targetCreature
  const scannedCount = creatureList.filter(c => c.scanned).length

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#543a2c'; ctx.fillRect(0, 0, width, height)
  ctx.save(); ctx.translate(width / 2, height / 2); ctx.scale(scale, scale); ctx.translate(-camera.x, -camera.y)
  ctx.drawImage(terrain, 0, 0)

  if (routeOverview) {
    ctx.beginPath()
    PERSEVERANCE_PATH.forEach(({ x, y }, index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
    ctx.strokeStyle = '#eed6b980'; ctx.lineWidth = 1.5 / scale
    ctx.setLineDash([3 / scale, 7 / scale]); ctx.stroke(); ctx.setLineDash([])
  }

  if (wind && !reducedMotion) {
    ctx.save()
    ctx.strokeStyle = `rgba(244,216,172,${0.12 + wind.strength * 0.16})`
    ctx.lineWidth = 1
    const drift = time * (23 + wind.strength * 34)
    for (let i = 0; i < 95; i++) {
      const x = (i * 433.17 + drift * wind.x + 10000) % MAP_SIZE.width
      const y = (i * 197.83 + drift * wind.y + 10000) % MAP_SIZE.height
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wind.x * (9 + wind.strength * 15), y + wind.y * (9 + wind.strength * 15)); ctx.stroke()
    }
    if (wind.dustDevil) {
      const x = 850 + wind.phase * 750, y = 1150 - wind.phase * 360
      ctx.strokeStyle = '#efd5ad77'; ctx.lineWidth = 2
      for (let i = 0; i < 5; i++) {
        const r = 12 + i * 10 + Math.sin(time * 6 + i) * 3
        ctx.beginPath(); ctx.ellipse(x, y - i * 10, r, r * .42, -0.3, i * .2, Math.PI * 1.7 + i * .2); ctx.stroke()
      }
    }
    ctx.restore()
  }

  if (target) {
    ctx.strokeStyle = '#f1dfb6a8'; ctx.lineWidth = 2; ctx.setLineDash([4, 9]); ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(target.x, target.y); ctx.stroke(); ctx.setLineDash([])
    ctx.strokeStyle = '#f1dfb6'; ctx.beginPath(); ctx.arc(target.x, target.y, 8, 0, Math.PI * 2); ctx.stroke()
  }

  if (showSites) {
    ctx.fillStyle = '#fae1a00b'; ctx.strokeStyle = '#ffe2a13b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(state.player.x, state.player.y, SCAN_RANGES[state.scannerLevel], 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    for (const site of SITES) pin(ctx, site, state.discoveries.includes(site.id), Math.hypot(site.x - state.player.x, site.y - state.player.y) <= SCAN_RANGES[state.scannerLevel])
    ctx.fillStyle = '#363932'; ctx.fillRect(CAMP.x - 27, CAMP.y - 14, 54, 28)
    ctx.fillStyle = state.beacon ? '#bbdcb3' : '#b2b5a3'; ctx.fillRect(CAMP.x - 22, CAMP.y - 26, 44, 22)
    ctx.strokeStyle = '#e9dec0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CAMP.x, CAMP.y - 26); ctx.lineTo(CAMP.x, CAMP.y - 65); ctx.stroke()
    ctx.fillStyle = state.beacon ? '#bce7b8' : '#e9b27e'; ctx.beginPath(); ctx.arc(CAMP.x, CAMP.y - 68, 5, 0, Math.PI * 2); ctx.fill()
    if (state.beacon) { ctx.strokeStyle = '#d6eebd88'; ctx.lineWidth = 1; for (const r of [15, 25, 35]) { ctx.beginPath(); ctx.arc(CAMP.x, CAMP.y - 68, r, -0.9, 0.9); ctx.stroke() } }
    ctx.font = '600 10px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f3e4c8'
    if (showLandingMarker) ctx.fillText(state.beacon ? 'SURVEY BEACON · ONLINE' : 'LANDING CAMP', CAMP.x, CAMP.y + 34)
    if (showLandingMarker) {
      ctx.strokeStyle = '#fff4df'; ctx.lineWidth = 3
      ctx.fillStyle = '#e99a69'; ctx.beginPath(); ctx.arc(CAMP.x, CAMP.y - 53, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#26332ee8'; ctx.fillRect(CAMP.x - 67, CAMP.y - 94, 134, 22)
      ctx.fillStyle = '#fff3dd'; ctx.font = '700 10px Manrope, sans-serif'
      ctx.fillText('LANDING SITE', CAMP.x, CAMP.y - 79)
    }
    ctx.textAlign = 'left'
  }

  // Draw shed Perseverance scrap metal piles along the trail
  for (const creature of creatureList) {
    drawRoverScrapPile(
      ctx,
      creature.anchorX,
      creature.anchorY,
      creature.slot,
      creature.feasting,
      creature.scanned,
      time,
      reducedMotion
    )
  }

  // Draw Perseverance Rover at the end of the trail
  drawPerseveranceRover(ctx, PERSEVERANCE_ROVER.x, PERSEVERANCE_ROVER.y, allScanned, time, reducedMotion)

  // Depth-sort creatures and astronaut by y coordinate so overlap feels grounded
  const actors = [
    ...creatureList.map(creature => ({ kind: 'creature', y: creature.y, creature })),
    { kind: 'player', y: state.player.y },
  ].sort((a, b) => a.y - b.y)

  for (const actor of actors) {
    if (actor.kind === 'player') {
      drawSprite(ctx, 'astronaut', state.player.x, state.player.y, 3, moving && !reducedMotion, time, facing)
    } else {
      const c = actor.creature
      drawTrailCreature(
        ctx,
        c,
        targetCreature?.slot === c.slot,
        nearbySlot === c.slot,
        time,
        reducedMotion
      )
    }
  }

  ctx.restore()

  // Waypoint marker: locks onto the next unscanned creature eating rover scrap,
  // and ONLY points to Perseverance once every creature has been scanned.
  const waypointWorld = targetCreature
    ? { x: targetCreature.x, y: targetCreature.y - 68 }
    : { x: PERSEVERANCE_ROVER.x, y: PERSEVERANCE_ROVER.y - 56 }

  const targetScreenX = width / 2 + (waypointWorld.x - camera.x) * scale
  const targetScreenY = height / 2 + (waypointWorld.y - camera.y) * scale
  const visible = targetScreenX > 40 && targetScreenX < width - 40 && targetScreenY > 40 && targetScreenY < height - 55
  const playerX = width / 2 + (state.player.x - camera.x) * scale
  const playerY = height / 2 + (state.player.y - camera.y) * scale
  const direction = Math.atan2(targetScreenY - playerY, targetScreenX - playerX)
  const markerX = visible ? targetScreenX : Math.max(42, Math.min(width - 42, playerX + Math.cos(direction) * 84))
  const markerY = visible ? targetScreenY : Math.max(42, Math.min(height - 52, playerY + Math.sin(direction) * 84))

  const markerAccent = targetCreature ? '#ffbe64' : '#6ff0ce'
  questDiamond(ctx, markerX, markerY, 11.5, time, reducedMotion, markerAccent)

  const badgeText = targetCreature
    ? (visible
      ? `SPECIMEN ${scannedCount + 1}/${creatureList.length}`
      : `CREATURE SIGNAL · ${scannedCount + 1}/${creatureList.length}`)
    : (visible ? 'PERSEVERANCE' : 'PERSEVERANCE ROVER')

  ctx.font = '700 10px Manrope, sans-serif'
  const badgeW = Math.max(114, ctx.measureText(badgeText).width + 20)
  ctx.fillStyle = '#16241fe8'
  ctx.strokeStyle = targetCreature ? '#ffd48c66' : '#85f2d477'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(markerX - badgeW / 2, markerY + 17, badgeW, 20, 5)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = targetCreature ? '#ffeac2' : '#d2fff2'
  ctx.textAlign = 'center'
  ctx.fillText(badgeText, markerX, markerY + 30.5)
  ctx.textAlign = 'left'

  if (!visible) {
    ctx.save()
    ctx.translate(markerX + Math.cos(direction) * 27, markerY + Math.sin(direction) * 27)
    ctx.rotate(direction)
    ctx.fillStyle = targetCreature ? '#ffe4ad' : '#b8ffea'
    ctx.beginPath()
    ctx.moveTo(7, 0)
    ctx.lineTo(-4, -5)
    ctx.lineTo(-4, 5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

export function renderMinimap(canvas, terrain, state, creatures, showLandingMarker = false, time = 0, reducedMotion = false, showSites = false) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const creatureList = creatures || []
  const targetCreature = getActiveTargetCreature(creatureList)

  const center = canvas.width / 2, radius = center - 5, scale = .2
  const at = point => ({ x: center + (point.x - state.player.x) * scale, y: center + (point.y - state.player.y) * scale })
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save(); ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = '#74513e'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save(); ctx.translate(center, center); ctx.scale(scale, scale); ctx.translate(-state.player.x, -state.player.y); ctx.drawImage(terrain, 0, 0); ctx.restore()
  ctx.fillStyle = '#152a2422'; ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (showSites) {
    SITES.forEach(site => { const point = at(site); ctx.fillStyle = state.discoveries.includes(site.id) ? '#cce8b5' : '#f4c99d'; ctx.beginPath(); ctx.arc(point.x, point.y, 3, 0, Math.PI * 2); ctx.fill() })
  }

  // Draw creatures on radar minimap (unscanned = amber blip, scanned = green blip)
  for (const creature of creatureList) {
    const point = at(creature)
    ctx.fillStyle = creature.scanned ? '#9be3aa' : '#ffcc73'
    ctx.beginPath()
    ctx.arc(point.x, point.y, creature.scanned ? 2.6 : 3.4, 0, Math.PI * 2)
    ctx.fill()
  }

  if (showLandingMarker) {
    const landing = at(CAMP)
    ctx.fillStyle = '#e99a69'; ctx.strokeStyle = '#fff4df'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(landing.x, landing.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }

  // Quest diamond on minimap tracks the active creature (NOT Perseverance until all creatures are scanned)
  const waypointPoint = at(targetCreature || PERSEVERANCE_ROVER)
  const dx = waypointPoint.x - center, dy = waypointPoint.y - center, length = Math.hypot(dx, dy)
  const limit = radius - 18
  const marker = length > limit ? { x: center + dx / length * limit, y: center + dy / length * limit } : waypointPoint
  questDiamond(ctx, marker.x, marker.y, 8, time, reducedMotion, targetCreature ? '#ffbe64' : '#6ff0ce')

  // Player triangle at radar center
  ctx.fillStyle = '#fff9eb'; ctx.beginPath(); ctx.moveTo(center, center - 7); ctx.lineTo(center - 5, center + 6); ctx.lineTo(center + 5, center + 6); ctx.closePath(); ctx.fill()
  ctx.restore()
  ctx.strokeStyle = '#d3e8d2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(center, center, radius - 1, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#f5eddf'; ctx.font = '700 11px Manrope, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', center, 17); ctx.textAlign = 'left'
}
