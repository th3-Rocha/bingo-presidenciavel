import type { Speaker } from "./phrases"

export const SIZE = 5
export const CENTER = 12
export const SLOTS = SIZE * SIZE - 1

export type Cell = { text: string; speaker: Speaker }

export type Card = {
  name: string
  cells: Cell[] // SLOTS entries, the free center is not stored
  lockedAt: number | null
  marked: number[] // board indexes (0..24), center implied
}

// Fill this after the debate with the texts that came up; the board auto-marks them.
export const RESULTS: string[] = []

export const LINES: number[][] = (() => {
  const idx = [...Array(SIZE).keys()]
  return [
    ...idx.map((r) => idx.map((c) => r * SIZE + c)),
    ...idx.map((c) => idx.map((r) => r * SIZE + c)),
    idx.map((i) => i * SIZE + i),
    idx.map((i) => i * SIZE + (SIZE - 1 - i)),
  ]
})()

export const toBoard = (cells: Cell[]): (Cell | null)[] => [
  ...cells.slice(0, CENTER),
  null,
  ...cells.slice(CENTER),
]

export function score(marked: Set<number>) {
  const lines = LINES.filter((line) => line.every((i) => marked.has(i)))
  const hits = marked.size - (marked.has(CENTER) ? 1 : 0)
  const full = hits === SLOTS
  return { hits, lines, full, points: hits + lines.length * 5 + (full ? 25 : 0) }
}

const SPEAKER_CODES: Speaker[] = ["lula", "flavio", "geral"]

// Shared links carry the whole card, so there's no backend to keep.
export function encodeCard(card: Pick<Card, "name" | "cells">) {
  const payload = { n: card.name, c: card.cells.map((c) => [c.text, SPEAKER_CODES.indexOf(c.speaker)]) }
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodeCard(raw: string): Pick<Card, "name" | "cells"> | null {
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/")
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { n: string; c: [string, number][] }
    if (!Array.isArray(payload.c) || payload.c.length !== SLOTS) return null
    return {
      name: String(payload.n ?? "").slice(0, 40),
      cells: payload.c.map(([text, s]) => ({
        text: String(text).slice(0, 80),
        speaker: SPEAKER_CODES[s] ?? "geral",
      })),
    }
  } catch {
    return null
  }
}

const STORAGE_KEY = "bingo-debate-card-v2"

export function loadCard(): Card | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Card) : null
  } catch {
    return null
  }
}

export function saveCard(card: Card | null) {
  try {
    if (card) localStorage.setItem(STORAGE_KEY, JSON.stringify(card))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
