#!/usr/bin/env node
// Smoke test for cks-skills/ — runs the EXACT frontmatter parser used by
// src/routes/api/skills.ts against every SKILL.md in cks-skills/ and asserts
// that name/description/triggers/category/icon would render correctly in the
// ClawSuite Skills Browser.
//
// Usage: node scripts/test-cks-skills.mjs

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', 'cks-skills')

// ── Parser ports (1:1 from src/routes/api/skills.ts) ──────────────────────

function stripQuotes(input) {
  const trimmed = input.trim()
  if (trimmed.length < 2) return trimmed
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseScalar(input) {
  const value = stripQuotes(input)
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value)
    if (!Number.isNaN(n)) return n
  }
  return value
}

function collectIndentedBlock(lines, startIndex) {
  const block = []
  let index = startIndex
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '') {
      block.push('')
      index += 1
      continue
    }
    if (!line.startsWith('  ')) break
    block.push(line.slice(2))
    index += 1
  }
  return { block, nextIndex: index }
}

function parseIndentedMap(block) {
  const result = {}
  let index = 0
  while (index < block.length) {
    const line = block[index]
    if (line.trim() === '' || line.trim().startsWith('#')) {
      index += 1
      continue
    }
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!m) {
      index += 1
      continue
    }
    result[m[1]] = parseScalar(m[2])
    index += 1
  }
  return result
}

function splitFrontmatter(markdown) {
  const lines = markdown.replace(/^﻿/, '').split(/\r?\n/)
  let index = 0
  while (index < lines.length) {
    const line = lines[index].trim()
    if (line === '') { index += 1; continue }
    break
  }
  if (lines[index]?.trim() !== '---') {
    return { frontmatter: '', content: markdown }
  }
  let end = index + 1
  while (end < lines.length && lines[end].trim() !== '---') end += 1
  if (end >= lines.length) return { frontmatter: '', content: markdown }
  return {
    frontmatter: lines.slice(index + 1, end).join('\n'),
    content: lines.slice(end + 1).join('\n').trim(),
  }
}

function parseFrontmatter(frontmatter) {
  const lines = frontmatter.split(/\r?\n/)
  const parsed = {}
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '' || line.trim().startsWith('#')) { index += 1; continue }
    const km = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!km) { index += 1; continue }
    const key = km[1]
    const value = km[2]
    if (value === '|' || value === '|-' || value === '>' || value === '>-') {
      const { block, nextIndex } = collectIndentedBlock(lines, index + 1)
      parsed[key] = (value === '>' || value === '>-')
        ? block.join(' ').replace(/\s+/g, ' ').trim()
        : block.join('\n').trim()
      index = nextIndex
      continue
    }
    if (value === '') {
      const { block, nextIndex } = collectIndentedBlock(lines, index + 1)
      if (block.length > 0 && block.some(l => l.trim().startsWith('- '))) {
        parsed[key] = block
          .map(l => l.match(/^\s*-\s+(.*)$/)?.[1] ?? '')
          .map(stripQuotes)
          .filter(Boolean)
      } else {
        parsed[key] = parseIndentedMap(block)
      }
      index = nextIndex
      continue
    }
    parsed[key] = parseScalar(value)
    index += 1
  }
  return parsed
}

// ── Validation rules ──────────────────────────────────────────────────────

const KNOWN_CATEGORIES = new Set([
  'Web & Frontend','Coding Agents','Git & GitHub','DevOps & Cloud',
  'Browser & Automation','Image & Video','Search & Research','AI & LLMs',
  'Productivity','Marketing & Sales','Communication','Data & Analytics',
  'Finance & Crypto',
])

function validate(skillId, parsed, content) {
  const errors = []
  const warnings = []

  if (typeof parsed.name !== 'string' || parsed.name.trim().length === 0) {
    errors.push('missing or empty `name`')
  }
  if (typeof parsed.description !== 'string' || parsed.description.trim().length === 0) {
    errors.push('missing or empty `description`')
  } else if (parsed.description.length > 500) {
    warnings.push(`description is ${parsed.description.length} chars (>500 recommended)`)
  }
  if (!Array.isArray(parsed.triggers) || parsed.triggers.length === 0) {
    errors.push('missing or empty `triggers` list')
  }
  if (parsed.metadata && typeof parsed.metadata === 'object') {
    const cat = parsed.metadata.category
    if (typeof cat === 'string' && !KNOWN_CATEGORIES.has(cat)) {
      warnings.push(`metadata.category="${cat}" not in canonical KNOWN_CATEGORIES — will be re-derived`)
    }
  } else {
    warnings.push('missing `metadata` block (author/category/version)')
  }
  if (content.trim().length < 200) {
    warnings.push(`body is ${content.trim().length} chars (very short — operator UI will look empty)`)
  }
  // Required body sections we agreed upon (convention internal)
  const requiredSections = [
    '## Cuándo invocar',
    '## Procedimiento',
  ]
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      warnings.push(`body is missing canonical section "${section}"`)
    }
  }
  return { errors, warnings }
}

// ── Runner ────────────────────────────────────────────────────────────────

async function discoverSkillFolders(root) {
  const out = []
  const entries = await fs.readdir(root, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const folder = path.join(root, entry.name)
    const skillMd = path.join(folder, 'SKILL.md')
    try {
      await fs.access(skillMd)
      out.push({ id: entry.name, path: skillMd })
    } catch { /* skip */ }
  }
  return out
}

async function main() {
  const skills = await discoverSkillFolders(ROOT)
  if (skills.length === 0) {
    console.error(`No SKILL.md found under ${ROOT}`)
    process.exit(1)
  }
  let totalErrors = 0
  let totalWarnings = 0
  console.log(`\n🔍  Validating ${skills.length} CKS skills against ClawSuite parser...\n`)
  for (const skill of skills) {
    const md = await fs.readFile(skill.path, 'utf8')
    const { frontmatter, content } = splitFrontmatter(md)
    if (!frontmatter) {
      console.error(`❌ ${skill.id}: NO frontmatter detected (parser would treat as bare markdown)`)
      totalErrors += 1
      continue
    }
    const parsed = parseFrontmatter(frontmatter)
    const { errors, warnings } = validate(skill.id, parsed, content)
    const ok = errors.length === 0
    const flag = ok ? '✅' : '❌'
    console.log(`${flag} ${skill.id}`)
    console.log(`   name:        ${parsed.name}`)
    console.log(`   triggers:    ${(parsed.triggers || []).join(', ') || '(none)'}`)
    console.log(`   category:    ${parsed.metadata?.category || '(none — will fall back to derived)'}`)
    console.log(`   body chars:  ${content.length}`)
    for (const e of errors) {
      console.log(`   ❌ error:   ${e}`)
      totalErrors += 1
    }
    for (const w of warnings) {
      console.log(`   ⚠️  warn:    ${w}`)
      totalWarnings += 1
    }
    console.log('')
  }
  console.log(`Summary: ${skills.length} skills · ${totalErrors} errors · ${totalWarnings} warnings`)
  process.exit(totalErrors === 0 ? 0 : 1)
}

main().catch(err => {
  console.error('test runner crashed:', err)
  process.exit(2)
})
