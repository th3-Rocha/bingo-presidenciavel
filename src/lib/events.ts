import { Redis } from "@upstash/redis"

import type { Speaker } from "./phrases"

export type DebateEvent = { id: number; text: string; speaker: Speaker | null; at: number }

const KEY = "bingo:events"
const SEQ = "bingo:seq"

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
const redis = url && token ? new Redis({ url, token }) : null

// Without Redis (local dev) events live in memory and vanish on restart.
const memory = globalThis as unknown as { __bingoEvents?: DebateEvent[]; __bingoSeq?: number }

export async function listEvents(): Promise<DebateEvent[]> {
  if (!redis) return memory.__bingoEvents ?? []
  return (await redis.lrange<DebateEvent>(KEY, 0, -1)) ?? []
}

export async function addEvent(text: string, speaker: Speaker | null): Promise<DebateEvent> {
  if (!redis) {
    memory.__bingoSeq = (memory.__bingoSeq ?? 0) + 1
    const event = { id: memory.__bingoSeq, text, speaker, at: Date.now() }
    memory.__bingoEvents = [...(memory.__bingoEvents ?? []), event]
    return event
  }
  const id = await redis.incr(SEQ)
  const event = { id, text, speaker, at: Date.now() }
  await redis.rpush(KEY, event)
  return event
}

export async function removeEvent(id: number): Promise<boolean> {
  const events = await listEvents()
  const kept = events.filter((e) => e.id !== id)
  if (kept.length === events.length) return false
  if (!redis) {
    memory.__bingoEvents = kept
    return true
  }
  const tx = redis.multi()
  tx.del(KEY)
  if (kept.length) tx.rpush(KEY, ...kept)
  await tx.exec()
  return true
}
