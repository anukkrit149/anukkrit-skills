#!/usr/bin/env node
/**
 * Update a single section in a prompt type within fallback.json.
 * Handles the long-line JSON issue that makes Edit tool unreliable.
 *
 * Usage: node scripts/update-prompt.js <prompt-type> <section-key> <content>
 *    or: node scripts/update-prompt.js <prompt-type> <section-key> --file <path>
 *    or: node scripts/update-prompt.js <prompt-type> --delete <section-key>
 *
 * Examples:
 *   node scripts/update-prompt.js animate role "New role text here"
 *   node scripts/update-prompt.js animate tools --file /tmp/new-tools.txt
 *   node scripts/update-prompt.js animate --delete workflow
 */

const fs = require('fs')
const path = require('path')

const FALLBACK_PATH = 'packages/ai/src/prompts/data/fallback.json'

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: node update-prompt.js <prompt-type> <section-key> <content|--file path|--delete>')
  process.exit(1)
}

const promptType = args[0]
const data = JSON.parse(fs.readFileSync(FALLBACK_PATH, 'utf8'))

if (!data.prompts[promptType]) {
  console.error(`Unknown prompt type: ${promptType}. Available: ${Object.keys(data.prompts).join(', ')}`)
  process.exit(1)
}

// Handle --delete
if (args[1] === '--delete') {
  const sectionKey = args[2]
  if (data.prompts[promptType].sections[sectionKey] !== undefined) {
    delete data.prompts[promptType].sections[sectionKey]
    console.log(`Deleted ${promptType}.${sectionKey}`)
  } else {
    console.log(`Section ${sectionKey} not found in ${promptType}`)
  }
} else {
  const sectionKey = args[1]

  // Get content from --file or inline
  let content
  if (args[2] === '--file') {
    content = fs.readFileSync(args[3], 'utf8')
  } else {
    content = args.slice(2).join(' ')
  }

  const oldLen = (data.prompts[promptType].sections[sectionKey] || '').length
  data.prompts[promptType].sections[sectionKey] = content
  console.log(`Updated ${promptType}.${sectionKey}: ${oldLen} → ${content.length} chars`)
}

fs.writeFileSync(FALLBACK_PATH, JSON.stringify(data, null, 2))
console.log('Written to', FALLBACK_PATH)
