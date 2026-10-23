"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { Check, Lock, Radio, Share2 } from "lucide-react"

import { Legend, PlayBoard, ScoreBanner } from "@/components/board"
import { Builder } from "@/components/builder"
import { Button } from "@/components/ui/button"
import { useLive } from "@/hooks/use-live"
import { cn } from "@/lib/utils"
import type { DebateEvent } from "@/lib/events"
import {
  type Card,
  type Cell,
  CENTER,
  type Slots,
  SLOTS,
  decodeCard,
  emptySlots,
  encodeCard,
  cellSaid,
  fillEmpty,
  loadCard,
  progress,
  saveCard,
  score,
  slotToBoard,
} from "@/lib/card"

type Shared = { name: string; slots: Slots }

// Official events mark the card on their own; manual marks cover anything the feed missed.
function marksFor(slots: Slots, manual: number[], said: Set<string>) {
  const auto = slots.flatMap((c, s) => (c && cellSaid(c, slotToBoard(s), said) ? [slotToBoard(s)] : []))
  return new Set([CENTER, ...manual, ...auto])
}

export function BingoApp() {
  const live = useLive()
  const [card, setCard] = useState<Card | null>(null)
  const [shared, setShared] = useState<Shared | null>(null)

  useEffect(() => {
    // localStorage and the URL only exist in the browser, so state is resolved after mount.
    const raw = new URLSearchParams(window.location.search).get("c")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShared(raw ? decodeCard(raw) : null)
    setCard(loadCard() ?? { name: "", slots: emptySlots(), marked: [] })
  }, [])

  useEffect(() => {
    if (card) saveCard(card)
  }, [card])

  // At 21h20 any gaps get filled so everyone plays a full card.
  const incomplete = !!card?.slots.includes(null)
  useEffect(() => {
    if (live.locked && incomplete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCard((c) => (c ? { ...c, slots: fillEmpty(c.slots) } : c))
    }
  }, [live.locked, incomplete])

  if (!card) {
    return <div className="mx-auto aspect-square w-full max-w-xl animate-pulse rounded-2xl bg-card" />
  }

  if (shared) {
    return (
      <SharedView
        shared={shared}
        said={live.said}
        onBuildOwn={() => {
          window.history.replaceState(null, "", window.location.pathname)
          setShared(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StatusBar locked={live.locked} msToLock={live.msToLock} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={card.name}
          onChange={(e) => setCard({ ...card, name: e.target.value.slice(0, 30) })}
          placeholder="Seu nome"
          aria-label="Seu nome"
          className="h-10 min-w-0 flex-1 rounded-lg border bg-card/60 px-3 font-display text-lg tracking-wide uppercase outline-none placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <ShareButton card={card} said={live.said} disabled={!live.locked && !progress(card.slots).complete} />
      </div>

      {live.locked ? (
        <PlayView card={card} said={live.said} events={live.events} onChange={setCard} />
      ) : (
        <Builder slots={card.slots} onChange={(slots) => setCard({ ...card, slots })} />
      )}
    </div>
  )
}

function StatusBar({ locked, msToLock }: { locked: boolean; msToLock: number }) {
  if (locked) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-pt px-4 py-2.5 font-display tracking-widest uppercase">
        <span className="size-2.5 animate-pulse rounded-full bg-papel" /> Ao vivo · cartelas travadas · marque o que sair
      </div>
    )
  }
  const s = Math.floor(msToLock / 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  const clock = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-card px-4 py-2.5 ring-1 ring-border">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="size-3.5" /> Cartelas travam às 21h20 em
      </span>
      <span className="font-display text-2xl tracking-wider text-amarelo tabular-nums">{clock}</span>
    </div>
  )
}

function ShareButton({ card, said, disabled }: { card: Card; said: Set<string>; disabled: boolean }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = `${window.location.origin}/?c=${encodeCard(card)}`
    const pts = score(marksFor(card.slots, card.marked, said)).points
    const text = said.size
      ? `Tô com ${pts} pontos no Bingo do Debate 🇧🇷 Olha minha cartela:`
      : "Meus palpites pro debate de hoje 🇧🇷 Monta a sua antes das 21h20:"
    try {
      if (navigator.share) {
        await navigator.share({ text, url })
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <Button size="lg" className="h-10 font-display tracking-wider uppercase" onClick={share} disabled={disabled}>
      {copied ? <Check /> : <Share2 />} {copied ? "Copiado" : "Compartilhar"}
    </Button>
  )
}

function useCelebrate(marked: Set<number>) {
  const { lines, full } = score(marked)
  const prev = useRef(lines.length)
  useEffect(() => {
    if (lines.length > prev.current) {
      const colors = ["#e0261b", "#16a34a", "#ffdf00", "#ffffff"]
      confetti({ particleCount: full ? 300 : 150, spread: full ? 120 : 85, origin: { y: 0.7 }, colors })
    }
    prev.current = lines.length
  }, [lines.length, full])
}

function PlayView({
  card,
  said,
  events,
  onChange,
}: {
  card: Card
  said: Set<string>
  events: DebateEvent[]
  onChange: (card: Card) => void
}) {
  const marked = useMemo(() => marksFor(card.slots, card.marked, said), [card, said])
  useCelebrate(marked)

  const toggle = (i: number) =>
    onChange({
      ...card,
      marked: card.marked.includes(i) ? card.marked.filter((x) => x !== i) : [...card.marked, i],
    })

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-3">
        <ScoreBanner marked={marked} />
        <PlayBoard slots={card.slots as Cell[]} marked={marked} said={said} onToggle={toggle} />
        <Legend />
      </div>
      <LiveFeed events={events} />
    </div>
  )
}


function LiveFeed({ events }: { events: DebateEvent[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card/60 p-4 ring-1 ring-border lg:sticky lg:top-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-widest uppercase">
        <Radio className="size-4 text-pt" /> Saiu no debate
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">{events.length}</span>
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada ainda. Assim que sair, aparece aqui e marca sozinho.</p>
      ) : (
        <ol className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
          {[...events].reverse().map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <span className="font-mono text-xs text-muted-foreground">#{e.id}</span>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 font-display text-xs tracking-wider",
                  e.speaker === "lula" ? "bg-pt" : e.speaker === "flavio" ? "bg-verde" : "bg-amarelo text-noite"
                )}
              >
                {e.speaker === "lula" ? "LULA" : e.speaker === "flavio" ? "FLÁVIO" : "AMBOS"}
              </span>
              <span className="font-display tracking-wide uppercase">{e.text}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {new Date(e.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function SharedView({ shared, said, onBuildOwn }: { shared: Shared; said: Set<string>; onBuildOwn: () => void }) {
  const complete = shared.slots.filter(Boolean).length === SLOTS
  const marked = useMemo(() => marksFor(shared.slots, [], said), [shared, said])
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-xl tracking-wide uppercase">
          {shared.name ? `Cartela de ${shared.name}` : "Cartela de um amigo"}
        </span>
        <Button size="lg" className="font-display tracking-wider uppercase" onClick={onBuildOwn}>
          Montar a minha
        </Button>
      </div>
      {said.size > 0 && <ScoreBanner marked={marked} />}
      {complete && <PlayBoard slots={shared.slots as Cell[]} marked={marked} said={said} />}
    </div>
  )
}
