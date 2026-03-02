'use client'

/**
 * CompactionNotifier — global cross-screen compaction detection.
 *
 * The gateway auto-compacts at ~40% context usage, BEFORE the context-alert
 * modal's 35% threshold can fire for the first time. This component detects
 * compaction by watching for significant drops in session message count and
 * shows a persistent toast regardless of which screen the user is on.
 */

import { useEffect, useRef } from 'react'
import { toast } from '@/components/ui/toast'

const POLL_MS = 20_000
const DROP_RATIO = 0.55 // if count drops to <55% of last known → compacted
const STORAGE_PREFIX = 'clawsuite-msg-count-'
const MIN_MESSAGES_TO_TRACK = 5 // ignore tiny sessions

function storageKey(sessionKey: string) {
  return `${STORAGE_PREFIX}${sessionKey}`
}

function loadCount(sessionKey: string): number | null {
  try {
    const raw = sessionStorage.getItem(storageKey(sessionKey))
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function saveCount(sessionKey: string, count: number) {
  try {
    sessionStorage.setItem(storageKey(sessionKey), String(count))
  } catch {
    /* ignore */
  }
}

async function fetchMainSession(): Promise<{
  key: string
  messageCount: number
} | null> {
  try {
    const res = await fetch('/api/gateway/sessions')
    if (!res.ok) return null
    const data = await res.json()
    const sessions: any[] = data?.sessions ?? data ?? []
    const main = sessions.find(
      (s: any) => s.kind === 'main' || (s.key && s.key.includes(':main')),
    )
    if (!main) return null
    return {
      key: main.key ?? main.sessionKey ?? 'main',
      messageCount: main.messageCount ?? main.messages ?? 0,
    }
  } catch {
    return null
  }
}

export function CompactionNotifier() {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    let fired = false

    async function check() {
      if (!active) return
      const session = await fetchMainSession()
      if (!session || !active) return

      const { key, messageCount } = session
      if (messageCount < MIN_MESSAGES_TO_TRACK) {
        saveCount(key, messageCount)
        return
      }

      const last = loadCount(key)

      if (last !== null && messageCount < last * DROP_RATIO && !fired) {
        // Message count dropped significantly — compaction happened
        const notifyKey = `${key}:${last}`
        if (!notifiedRef.current.has(notifyKey)) {
          notifiedRef.current.add(notifyKey)
          fired = true
          toast(
            '🗜️ Context compacted — older messages were summarized to free space',
            { type: 'info', duration: 10_000 },
          )
        }
      }

      // Always update if count grew (or on first run)
      if (last === null || messageCount > last) {
        saveCount(key, messageCount)
      }
    }

    void check()
    const id = setInterval(() => { void check() }, POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return null
}
