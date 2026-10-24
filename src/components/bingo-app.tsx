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
  loadCard,
  progress,
  saveCard,
  tally,
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

  if (!card) {
    return <div className="mx-auto aspect-square w-full max-w-xl animate-pulse rounded-2xl bg-card" />
  }

  if (shared) {
    return (
      <SharedView
        shared={shared}
        said={card.revealed ? live.said : EMPTY}
        hidden={!card.revealed}
        onBuildOwn={() => {
          window.history.replaceState(null, "", window.location.pathname)
          setShared(null)
        }}
      />
    )
  }

  const p = progress(card.slots)
  // Results stay hidden until the full card goes out, so nobody builds it off the feed.
  const revealed = !!card.revealed && p.complete
  return (
    <div className="flex min-w-0 flex-col gap-6 pb-24">
      {revealed ? (
        <PlayView card={card} said={live.said} events={live.events} onChange={setCard} />
      ) : (
        <>
          <Hidden count={live.events.length} filled={p.filled} />
          <Builder slots={card.slots} said={EMPTY} onChange={(slots) => setCard({ ...card, slots })} />
        </>
      )}

      {/* Always-visible bar: name + share, so nobody has to scroll back up on a phone. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-noite/85 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <input
            value={card.name}
            onChange={(e) => setCard({ ...card, name: e.target.value.slice(0, 30) })}
            placeholder="Seu nome"
            aria-label="Seu nome"
            className="h-11 min-w-0 flex-1 rounded-xl border bg-card px-3 font-display text-lg tracking-wide uppercase outline-none placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <ShareButton
            card={card}
            said={revealed ? live.said : EMPTY}
            disabled={!p.complete}
            hint={p.complete ? null : `${p.filled}/${SLOTS}`}
            onShared={() => setCard((c) => (c && !c.revealed ? { ...c, revealed: true } : c))}
          />
        </div>
      </div>
    </div>
  )
}

const EMPTY = new Set<string>()

function Hidden({ count, filled }: { count: number; filled: number }) {
  return (
    <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-border">
      <Lock className="size-5 shrink-0 text-amarelo" />
      <span className="text-muted-foreground">
        {count > 0 ? (
          <>
            <strong className="text-foreground">{count} fala{count === 1 ? "" : "s"}</strong> já saiu
            {count === 1 ? "" : "ram"} no debate.{" "}
          </>
        ) : null}
        {filled < SLOTS
          ? "Complete as 24 e mande pra galera pra ver o placar. Depois disso a cartela trava."
          : "Cartela cheia! Toque em “Mandar” pra ver o placar. Depois disso ela trava."}
      </span>
    </div>
  )
}

function ShareButton({
  card,
  said,
  disabled,
  hint,
  onShared,
}: {
  card: Card
  said: Set<string>
  disabled: boolean
  hint: string | null
  onShared: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [fallback, setFallback] = useState<string | null>(null)

  const share = async () => {
    if (disabled) {
      setNotice(`Falta completar a cartela (${hint}). Toque nas frases ou em “Completar”.`)
      setTimeout(() => setNotice(null), 3000)
      return
    }
    const url = `${window.location.origin}/?c=${encodeCard(card)}`
    const pts = score(marksFor(card.slots, card.marked, said)).points
    const text = said.size
      ? `Tô com ${pts} pontos no Bingo do Debate 🇧🇷 Olha minha cartela:`
      : "Meus palpites pro debate 🇧🇷 Monta a sua:"
    try {
      if (navigator.share) {
        await navigator.share({ text, url })
        onShared()
        return
      }
    } catch (e) {
      // User closed the share sheet: nothing to do.
      if (e instanceof DOMException && e.name === "AbortError") return
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      onShared()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // In-app browsers (Instagram, WhatsApp) may block both: show the link to copy by hand.
      setFallback(url)
      onShared()
    }
  }

  return (
    <>
      {(notice || fallback) && (
        <div className="absolute inset-x-3 bottom-full mb-2 mx-auto max-w-xl rounded-xl bg-card p-3 text-sm shadow-xl ring-1 ring-border">
          {notice ?? (
            <div className="flex flex-col gap-2">
              <span>Copie o link e mande:</span>
              <input
                readOnly
                value={fallback ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 rounded-lg border bg-background px-2 text-base"
              />
              <button type="button" className="self-end text-xs text-muted-foreground underline" onClick={() => setFallback(null)}>
                fechar
              </button>
            </div>
          )}
        </div>
      )}
      <Button
        size="lg"
        className={cn(
          "h-11 rounded-xl px-4 font-display text-base tracking-wider uppercase",
          disabled && "opacity-60"
        )}
        onClick={share}
      >
        {copied ? <Check /> : <Share2 />} {copied ? "Copiado" : "Mandar"}
        {hint && <span className="text-xs tabular-nums opacity-70">{hint}</span>}
      </Button>
    </>
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-3">
        <ScoreBanner marked={marked} misses={tally(card.slots, said).misses} />
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

function SharedView({
  shared,
  said,
  hidden,
  onBuildOwn,
}: {
  shared: Shared
  said: Set<string>
  hidden: boolean
  onBuildOwn: () => void
}) {
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
      {hidden && (
        <p className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
          <Lock className="mr-1.5 inline size-4 text-amarelo" />
          Monte e mande a sua cartela pra ver os acertos dessa aqui.
        </p>
      )}
      {said.size > 0 && <ScoreBanner marked={marked} misses={tally(shared.slots, said).misses} />}
      {complete && <PlayBoard slots={shared.slots as Cell[]} marked={marked} said={said} />}
    </div>
  )
}
