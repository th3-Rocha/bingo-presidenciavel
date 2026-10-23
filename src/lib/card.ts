import { POOL, type Speaker } from "./phrases"

export const SIZE = 5
export const CENTER = 12
export const SLOTS = SIZE * SIZE - 1
export const CUSTOM_REQUIRED = 5
export const LIST_MAX = SLOTS - CUSTOM_REQUIRED

export type Cell = { text: string; speaker: Speaker | null; custom?: boolean }
export type Slots = (Cell | null)[] // SLOTS entries; the free center is not stored

export type Card = {
  name: string
  slots: Slots
  marked: number[] // board indexes (0..24), center implied
}

export const LINES: number[][] = (() => {
  const idx = [...Array(SIZE).keys()]
  return [
    ...idx.map((r) => idx.map((c) => r * SIZE + c)),
    ...idx.map((c) => idx.map((r) => r * SIZE + c)),
    idx.map((i) => i * SIZE + i),
    idx.map((i) => i * SIZE + (SIZE - 1 - i)),
  ]
})()

export const slotToBoard = (slot: number) => (slot < CENTER ? slot : slot + 1)
export const boardToSlot = (i: number) => (i < CENTER ? i : i - 1)

export const emptySlots = (): Slots => Array(SLOTS).fill(null)

export function progress(slots: Slots) {
  const cells = slots.filter((c): c is Cell => !!c)
  const custom = cells.filter((c) => c.custom).length
  const unassigned = cells.filter((c) => !c.speaker).length
  return {
    filled: cells.length,
    custom,
    list: cells.length - custom,
    unassigned,
    complete: cells.length === SLOTS && custom >= CUSTOM_REQUIRED && unassigned === 0,
  }
}

export function score(marked: Set<number>) {
  const lines = LINES.filter((line) => line.every((i) => marked.has(i)))
  const hits = marked.size - (marked.has(CENTER) ? 1 : 0)
  const full = hits === SLOTS
  return { hits, lines, full, points: hits + lines.length * 5 + (full ? 25 : 0) }
}

export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase()

// An event counts for a cell when the text matches and it came from the candidate
// the player bet on; events tagged "ambos" (null) count for either.
export const saidKey = (text: string, speaker: Speaker | null) => `${speaker ?? "*"}:${normalize(text)}`

export const cellSaid = (cell: Cell, said: Set<string>) =>
  said.has(saidKey(cell.text, null)) || (!!cell.speaker && said.has(saidKey(cell.text, cell.speaker)))

export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const randomSpeaker = (): Speaker => (Math.random() < 0.5 ? "lula" : "flavio")

// "Completar": fills list slots only, leaving room for the player's own phrases.
export function fillFromList(slots: Slots): Slots {
  const { filled, custom } = progress(slots)
  const used = new Set(slots.flatMap((c) => (c ? [normalize(c.text)] : [])))
  const extra = shuffle(POOL.filter((t) => !used.has(normalize(t))))
  let room = SLOTS - filled - Math.max(0, CUSTOM_REQUIRED - custom)
  return slots.map((c) => {
    if (c) return c.speaker ? c : { ...c, speaker: randomSpeaker() }
    if (room <= 0) return null
    room--
    return { text: extra.pop()!, speaker: randomSpeaker() }
  })
}

// At lock time everyone gets a full, fully assigned card.
export function fillEmpty(slots: Slots): Cell[] {
  const used = new Set(slots.flatMap((c) => (c ? [normalize(c.text)] : [])))
  const extra = shuffle(POOL.filter((t) => !used.has(normalize(t))))
  return slots.map((c) =>
    c ? (c.speaker ? c : { ...c, speaker: randomSpeaker() }) : { text: extra.pop()!, speaker: randomSpeaker() }
  )
}

const SPEAKER_CODES: Speaker[] = ["lula", "flavio"]

// Shared links carry the whole card, so nothing about players is stored server-side.
export function encodeCard(card: Pick<Card, "name" | "slots">) {
  const payload = {
    n: card.name,
    c: card.slots.map((c) =>
      c ? [c.text, c.speaker ? SPEAKER_CODES.indexOf(c.speaker) : -1, c.custom ? 1 : 0] : 0
    ),
  }
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodeCard(raw: string): Pick<Card, "name" | "slots"> | null {
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/")
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      n: string
      c: ([string, number, number?] | 0)[]
    }
    if (!Array.isArray(payload.c) || payload.c.length !== SLOTS) return null
    return {
      name: String(payload.n ?? "").slice(0, 30),
      slots: payload.c.map((c) =>
        Array.isArray(c)
          ? { text: String(c[0]).slice(0, 40), speaker: SPEAKER_CODES[c[1]] ?? null, custom: c[2] === 1 }
          : null
      ),
    }
  } catch {
    return null
  }
}

const STORAGE_KEY = "bingo-debate-card-v4"

export function loadCard(): Card | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const card = raw ? (JSON.parse(raw) as Card) : null
    return card && Array.isArray(card.slots) && card.slots.length === SLOTS ? card : null
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
