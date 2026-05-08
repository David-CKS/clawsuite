import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const SCRIPT = resolve(here, 'seed-cks-crons.mjs')

function runCli(args = []) {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { exitCode: 0, stdout, stderr: '' }
  } catch (err) {
    return {
      exitCode: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    }
  }
}

describe('seed-cks-crons CLI', () => {
  test('--help prints usage and exits 0', () => {
    const result = runCli(['--help'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/Usage:/i)
    expect(result.stdout).toMatch(/--base-url/)
    expect(result.stdout).toMatch(/--dry-run/)
  })

  test('rejects missing --base-url with non-zero exit', () => {
    const result = runCli([])
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr + result.stdout).toMatch(/base-url/i)
  })
})
