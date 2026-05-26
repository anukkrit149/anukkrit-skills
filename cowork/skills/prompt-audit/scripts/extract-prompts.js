#!/usr/bin/env node
/**
 * Extract all prompts from fallback.json into readable review files.
 * Also extracts runtime components (classifier, registry, cache-strategy).
 *
 * Usage: node scripts/extract-prompts.js [--fallback-path <path>] [--output-dir <path>]
 *
 * Defaults:
 *   --fallback-path: packages/ai/src/prompts/data/fallback.json
 *   --output-dir: docs/prompt-review-input
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const fallbackPath = args.includes('--fallback-path')
  ? args[args.indexOf('--fallback-path') + 1]
  : 'packages/ai/src/prompts/data/fallback.json'
const outputDir = args.includes('--output-dir')
  ? args[args.indexOf('--output-dir') + 1]
  : 'docs/prompt-review-input'

// Extract prompts
const data = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'))
fs.mkdirSync(outputDir, { recursive: true })

const promptTypes = ['animate', 'edit', 'spot_edit', 'general', 'create_component', 'compose_component', 'geneditor']

for (const ptype of promptTypes) {
  const sections = data.prompts[ptype].sections
  const content = Object.entries(sections)
    .filter(([k, v]) => v.length > 0)
    .map(([k, v]) => `### Section: ${k} (${v.length} chars)\n${v}`)
    .join('\n\n')

  const outPath = path.join(outputDir, `prompt-${ptype}.txt`)
  fs.writeFileSync(outPath, content)
  console.log(`${ptype}: ${content.length} chars → ${outPath}`)
}

// Extract runtime components
const runtimeFiles = [
  ['packages/ai/src/router/classifier.ts', 'runtime-classifier.txt'],
  ['packages/ai/src/skills/registry.ts', 'runtime-registry.txt'],
  ['packages/ai/src/prompts/cache-strategy.ts', 'runtime-cache-strategy.txt'],
]

for (const [src, dest] of runtimeFiles) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outputDir, dest))
    console.log(`${src} → ${dest}`)
  } else {
    console.warn(`SKIP: ${src} not found`)
  }
}

console.log(`\nDone. ${promptTypes.length} prompts + ${runtimeFiles.length} runtime files extracted to ${outputDir}/`)
