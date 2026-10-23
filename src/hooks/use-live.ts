"use client"

import { useEffect, useMemo, useState } from "react"

import { LOCK_AT, POLL_MS } from "@/lib/config"
import { normalize } from "@/lib/card"
import type { DebateEvent } from "@/lib/events"

// Polls the official feed and keeps a server-corrected clock, so the lock
// doesn't depend on whatever time the visitor's machine thinks it is.
export function useLive() {
  const [events, setEvents] = useState<DebateEvent[]>([])
  const [offset, setOffset] = useState(0)
  // 0 until mounted: prerendering must not read the clock.
  const [now, setNow] = useState(0)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { events: DebateEvent[]; serverTime: number }
        if (!alive) return
        setEvents(data.events)
        setOffset(data.serverTime - Date.now())
      } catch {}
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
    load()
    const poll = setInterval(load, POLL_MS)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      alive = false
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [])

  const serverNow = now + offset
  const ready = now > 0
  const said = useMemo(() => new Set(events.map((e) => normalize(e.text))), [events])

  return { events, said, ready, locked: ready && serverNow >= LOCK_AT, msToLock: Math.max(0, LOCK_AT - serverNow) }
}
