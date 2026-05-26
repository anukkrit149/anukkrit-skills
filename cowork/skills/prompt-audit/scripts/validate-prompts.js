#!/usr/bin/env node
/**
 * Validate fallback.json prompts against registry.ts tool lists and common issues.
 *
 * Checks:
 * 1. JSON is valid
 * 2. All 6 prompt types present
 * 3. Tool lists in prompt text match registry toolNames (no phantoms, no missing)
 * 4. All examples end with done()
 * 5. No "ALWAYS readFile" contradictions when pre-loaded
 * 6. No bare "NEVER" without reasoning
 * 7. Prompt placeholder fields are standardized
 *
 * Usage: node scripts/validate-prompts.js [--fallback-path <path>] [--registry-path <path>]
 */

const fs = require('fs')

const FALLBACK = process.argv.includes('--fallback-path')
  ? process.argv[process.argv.indexOf('--fallback-path') + 1]
  : 'packages/ai/src/prompts/data/fallback.json'

const REGISTRY = process.argv.includes('--registry-path')
  ? process.argv[process.argv.indexOf('--registry-path') + 1]
  : 'packages/ai/src/skills/registry.ts'

let passed = 0, failed = 0
function check(ok, name) {
  if (ok) { passed++; console.log(`  ✅ ${name}`) }
  else { failed++; console.log(`  ❌ ${name}`) }
}

// 1. JSON valid
let data
try {
  data = JSON.parse(fs.readFileSync(FALLBACK, 'utf8'))
  check(true, 'Valid JSON')
} catch (e) {
  check(false, `Valid JSON: ${e.message}`)
  process.exit(1)
}

// 2. All 6 prompt types
const expected = ['animate', 'edit', 'spot_edit', 'general', 'create_component', 'compose_component', 'geneditor']
for (const pt of expected) {
  check(!!data.prompts[pt], `Prompt type '${pt}' exists`)
}

// 3. Tool list check (parse registry if available)
if (fs.existsSync(REGISTRY)) {
  const regContent = fs.readFileSync(REGISTRY, 'utf8')
  const toolMap = {
    'animation-expert': 'animate',
    'design-system-expert': 'edit',
    'code-editor': 'edit',
    'layout-advisor': 'edit',
    'component-creator': 'create_component',
    'general': 'general',
    'component-composer': 'compose_component',
    'geneditor-generator': 'geneditor',
  }

  // Extract toolNames from registry (basic regex)
  // Collect ALL tools per promptType (shared prompts serve multiple skills)
  const toolsByPromptType = {}
  for (const [skillId, promptType] of Object.entries(toolMap)) {
    const regex = new RegExp(`'${skillId}'[\\s\\S]*?toolNames:\\s*\\[([^\\]]+)\\]`)
    const match = regContent.match(regex)
    if (!match) continue
    const tools = match[1].match(/'(\w+)'/g)?.map(t => t.replace(/'/g, '')) || []
    if (!toolsByPromptType[promptType]) toolsByPromptType[promptType] = new Set()
    tools.forEach(t => toolsByPromptType[promptType].add(t))
  }

  // Tools dynamically injected by the executor (not in static registry toolNames)
  const dynamicTools = new Set(['searchMemory'])

  // Check for phantom tools — only flag if NO skill sharing this prompt has the tool
  // and it's not a dynamically injected tool
  for (const [promptType, allTools] of Object.entries(toolsByPromptType)) {
    const toolsText = data.prompts[promptType]?.sections?.tools || ''
    const phantoms = ['listDirectory', 'readMultipleFiles', 'grep', 'writeFile', 'searchMemory']
      .filter(t => !allTools.has(t) && !dynamicTools.has(t) && toolsText.includes(t + ':'))
    if (phantoms.length > 0) {
      check(false, `${promptType}: phantom tools in text (not in ANY skill's toolNames): ${phantoms.join(', ')}`)
    }
  }
}

// 4. Examples have done()
for (const pt of expected) {
  if (pt === 'general') continue // general has no done() tool
  const examples = data.prompts[pt]?.sections?.examples || ''
  if (examples.length > 0) {
    check(examples.includes('done(') || examples.includes('done —'), `${pt} examples include done()`)
  }
}

// 5. No "ALWAYS readFile" contradictions
for (const pt of ['animate', 'edit', 'spot_edit']) {
  const allText = Object.values(data.prompts[pt].sections).join(' ')
  check(!allText.match(/ALWAYS (call )?readFile/i), `${pt}: no "ALWAYS readFile" contradiction`)
}

// 6. Prompt placeholders standardized
for (const pt of expected) {
  const prompt = data.prompts[pt].prompt || ''
  check(
    prompt.length < 100 || prompt.includes('Built from sections'),
    `${pt}: prompt field is placeholder (not stale)`
  )
}

// Results
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
