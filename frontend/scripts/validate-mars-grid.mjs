#!/usr/bin/env node
// Deep validation CLI for the SOLBOUND Mars grid integration.
//
//   npm run validate:grid
//   npm run validate:grid -- --quick
//   npm run validate:grid -- --data-dir "C:\\path\\to\\output" --json
//
// The full pass streams all 22,578,552 cells of the eight rasters and compares
// them with geology_quality_report.json and the embedded pipeline baseline.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  QUALITY_REPORT_FILE,
  openMarsGridFromDirectory,
  resolveMarsGridDataDir,
  validateMarsGrid,
} from '../src/shared/marsGrid/index.js'

function parseArguments(argv) {
  const options = { deep: true, json: false, dataDir: null, blockRows: 256 }
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--quick') options.deep = false
    else if (argument === '--deep') options.deep = true
    else if (argument === '--json') options.json = true
    else if (argument === '--data-dir') options.dataDir = argv[++index]
    else if (argument.startsWith('--data-dir=')) options.dataDir = argument.slice('--data-dir='.length)
    else if (argument === '--block-rows') options.blockRows = Number(argv[++index])
    else if (argument.startsWith('--block-rows=')) options.blockRows = Number(argument.slice('--block-rows='.length))
    else if (argument === '--help' || argument === '-h') {
      console.log('Usage: node scripts/validate-mars-grid.mjs [--quick] [--json] [--data-dir DIR] [--block-rows N]')
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }
  if (!Number.isInteger(options.blockRows) || options.blockRows <= 0) {
    throw new Error('--block-rows must be a positive integer.')
  }
  return options
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  const dataDir = await resolveMarsGridDataDir(options.dataDir)

  let qualityReport = null
  try {
    qualityReport = JSON.parse(await readFile(join(dataDir, QUALITY_REPORT_FILE), 'utf8'))
  } catch {
    // The report is optional; the embedded baseline still drives count checks.
  }

  const grid = await openMarsGridFromDirectory(dataDir)
  const startedAt = Date.now()
  try {
    const result = await validateMarsGrid(grid, {
      deep: options.deep,
      qualityReport,
      blockRows: options.blockRows,
    })
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

    if (options.json) {
      console.log(JSON.stringify({ dataDir, elapsedSeconds: Number(elapsed), ...result }, null, 2))
    } else {
      console.log(`SOLBOUND Mars grid validation (${options.deep ? 'deep' : 'quick'})`)
      console.log(`Data directory: ${dataDir}`)
      console.log(`Grid: ${grid.width} columns x ${grid.height} rows, ${grid.totalCells.toLocaleString()} cells`)
      console.log(`Layers: ${Object.keys(grid.layers).length}; legend classes: ${grid.getLegendClasses().length}`)
      console.log('')
      for (const check of result.checks) {
        console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.id.padEnd(38)} ${check.detail}`)
      }
      console.log('')
      console.log(`Overall: ${result.ok ? 'PASS' : 'FAIL'} (${result.checks.length} checks, ${elapsed}s)`)
      if (options.deep) {
        const summary = result.summary
        console.log(
          `Cells: ${summary.totalCells.toLocaleString()} total, `
          + `${summary.validDemCells.toLocaleString()} valid DEM, `
          + `${summary.navigableDemCells.toLocaleString()} navigable, `
          + `${summary.mappedGeologyCells.toLocaleString()} mapped geology, `
          + `${summary.classZeroCells.toLocaleString()} class 0.`,
        )
      }
    }

    if (!result.ok) process.exitCode = 1
  } finally {
    await grid.close()
  }
}

main().catch(error => {
  console.error(`Mars grid validation failed: ${error.message}`)
  process.exitCode = 1
})
