"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { Check, Share2, Trash2 } from "lucide-react"

import { Board, Legend, ScoreBanner } from "@/components/board"
import { Builder } from "@/components/builder"
import { Button } from "@/components/ui/button"
import {
  type Card,
  type Cell,
  CENTER,
  RESULTS,
  decodeCard,
  encodeCard,
  loadCard,
  saveCard,
  score,
  toBoard,
} from "@/lib/card"

type View =
  | { kind: "loading" }
  | { kind: "build" }
  | { kind: "mine"; card: Card }
  | { kind: "shared"; name: string; cells: Cell[] }

const resultsSet = new Set(RESULTS.map((t) => t.toLowerCase()))
const hasResults = resultsSet.size > 0

// With results published, marks come from what was actually said.
function marksFor(cells: Cell[], manual: number[]) {
  if (!hasResults) return new Set([CENTER, ...manual])
  const auto = toBoard(cells).flatMap((c, i) => (c && resultsSet.has(c.text.toLowerCase()) ? [i] : []))
  return new Set([CENTER, ...auto])
}

export function BingoApp() {
  const [view, setView] = useState<View>({ kind: "loading" })

  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get("c")
    const decoded = shared ? decodeCard(shared) : null
    const mine = loadCard()
    // localStorage and the URL only exist in the browser, so state is resolved after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(
      decoded
        ? { kind: "shared", ...decoded }
        : mine
          ? { kind: "mine", card: mine }
          : { kind: "build" }
    )
  }, [])

  useEffect(() => {
    if (view.kind === "mine") saveCard(view.card)
  }, [view])

  if (view.kind === "loading") {
    return <div className="mx-auto aspect-square w-full max-w-2xl animate-pulse rounded-xl bg-muted" />
  }

  if (view.kind === "build") {
    return (
      <Builder
        onLock={(name, cells) => {
          window.scrollTo({ top: 0 })
          setView({ kind: "mine", card: { name, cells, lockedAt: Date.now(), marked: [] } })
        }}
      />
    )
  }

  if (view.kind === "shared") {
    return (
      <SharedCard
        name={view.name}
        cells={view.cells}
        onBuildOwn={() => {
          window.history.replaceState(null, "", window.location.pathname)
          const mine = loadCard()
          setView(mine ? { kind: "mine", card: mine } : { kind: "build" })
        }}
      />
    )
  }

  return (
    <MyCard
      card={view.card}
      onChange={(card) => setView({ kind: "mine", card })}
      onReset={() => {
        saveCard(null)
        setView({ kind: "build" })
      }}
    />
  )
}

function MyCard({
  card,
  onChange,
  onReset,
}: {
  card: Card
  onChange: (card: Card) => void
  onReset: () => void
}) {
  const marked = useMemo(() => marksFor(card.cells, card.marked), [card])
  const { lines, full } = score(marked)
  const [copied, setCopied] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  // Celebrate only when a line is completed, not when the page reloads.
  const prevLines = useRef(lines.length)
  useEffect(() => {
    if (lines.length > prevLines.current) {
      confetti({ particleCount: full ? 300 : 140, spread: full ? 120 : 80, origin: { y: 0.7 } })
    }
    prevLines.current = lines.length
  }, [lines.length, full])

  const toggle = (i: number) =>
    onChange({
      ...card,
      marked: card.marked.includes(i) ? card.marked.filter((x) => x !== i) : [...card.marked, i],
    })

  const share = async () => {
    const url = `${window.location.origin}/?c=${encodeCard(card)}`
    const text = hasResults
      ? `Fiz ${score(marked).points} pontos no Bingo do Debate 🇧🇷 Olha minha cartela:`
      : "Esses são meus palpites pro debate de hoje 🇧🇷 Monta a sua:"
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {card.name ? <strong className="text-foreground">Cartela de {card.name}</strong> : "Sua cartela"}
          {card.lockedAt && (
            <>
              {" "}
              · travada às{" "}
              {new Date(card.lockedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={share}>
            {copied ? <Check /> : <Share2 />} {copied ? "Link copiado" : "Compartilhar"}
          </Button>
          <Button
            variant={confirmReset ? "destructive" : "outline"}
            size="sm"
            onClick={() => (confirmReset ? onReset() : setConfirmReset(true))}
            onBlur={() => setConfirmReset(false)}
          >
            <Trash2 /> {confirmReset ? "Apagar mesmo?" : "Refazer"}
          </Button>
        </div>
      </div>

      <ScoreBanner marked={marked} />
      <Board cells={card.cells} marked={marked} onToggle={hasResults ? undefined : toggle} />
      <p className="text-center text-xs text-muted-foreground">
        {hasResults
          ? "Resultado oficial: marcamos o que saiu da boca deles no debate."
          : "Durante o debate, toque no quadrado quando a frase sair. 1 pt por acerto, +5 por linha, +25 cartela cheia."}
      </p>
      <Legend />
    </div>
  )
}

function SharedCard({ name, cells, onBuildOwn }: { name: string; cells: Cell[]; onBuildOwn: () => void }) {
  const marked = useMemo(() => marksFor(cells, []), [cells])
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{name ? `Palpites de ${name}` : "Palpites de um amigo"}</strong>
        <Button size="sm" onClick={onBuildOwn}>
          Montar a minha
        </Button>
      </div>
      {hasResults && <ScoreBanner marked={marked} />}
      <Board cells={cells} marked={marked} />
      <Legend />
    </div>
  )
}
