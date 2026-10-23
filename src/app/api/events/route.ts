import { connection, type NextRequest } from "next/server"

import { addEvent, listEvents, removeEvent } from "@/lib/events"
import type { Speaker } from "@/lib/phrases"

// null speaker = "ambos", counts for whichever candidate the player picked
const SPEAKERS: Speaker[] = ["lula", "flavio"]

function authorized(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN
  return !!expected && req.headers.get("authorization") === `Bearer ${expected}`
}

export async function GET() {
  await connection()
  const events = await listEvents()
  return Response.json(
    { events, serverTime: Date.now() },
    // A short CDN cache keeps Redis load flat no matter how many people are polling.
    { headers: { "Cache-Control": "public, s-maxage=2, stale-while-revalidate=4" } }
  )
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const body = (await req.json().catch(() => null)) as { text?: unknown; speaker?: unknown } | null
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 80) : ""
  if (!text) return Response.json({ error: "text required" }, { status: 400 })
  const speaker = SPEAKERS.includes(body?.speaker as Speaker) ? (body!.speaker as Speaker) : null
  return Response.json(await addEvent(text, speaker), { status: 201 })
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 })
  const id = Number(req.nextUrl.searchParams.get("id"))
  if (!Number.isInteger(id)) return Response.json({ error: "id required" }, { status: 400 })
  return (await removeEvent(id))
    ? Response.json({ ok: true })
    : Response.json({ error: "not found" }, { status: 404 })
}
