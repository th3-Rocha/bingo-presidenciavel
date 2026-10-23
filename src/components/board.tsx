"use client"

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { Check, X } from "lucide-react"

import { Flag, Star } from "@/components/star"
import { cn } from "@/lib/utils"
import {
  type Cell,
  type CellStatus,
  CENTER,
  SIZE,
  type Slots,
  boardToSlot,
  cellStatus,
  score,
  speakerAt,
} from "@/lib/card"

type Tone = "pt" | "verde"

export const toneOf = (i: number): Tone => (speakerAt(i) === "lula" ? "pt" : "verde")

const toneBg: Record<Tone, string> = {
  pt: "bg-pt text-papel",
  verde: "bg-verde text-papel",
}

/** The tile itself: checkerboard color, decoration, text, dauber when marked. */
export function CellFace({
  cell,
  tone,
  marked = false,
  status = null,
  className,
}: {
  cell: Cell
  tone: Tone
  marked?: boolean
  status?: CellStatus
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex size-full items-center justify-center overflow-hidden rounded-lg p-1 text-center shadow-[inset_0_-3px_0_oklch(0_0_0/0.2)] sm:p-2",
        toneBg[tone],
        status?.result === "hit" && "saiu",
        status?.result === "miss" && "opacity-45 grayscale-[0.6]",
        className
      )}
    >
      {tone === "pt" ? (
        <Star className="pointer-events-none absolute -right-2 -bottom-2 size-10 text-papel/15 sm:size-14" />
      ) : (
        <Flag className="pointer-events-none absolute -right-3 -bottom-2 w-14 -rotate-12 text-papel/15 sm:w-20" />
      )}
      {marked && (
        <span className="stamp pointer-events-none absolute inset-[8%] rounded-full bg-amarelo/90 shadow-lg" />
      )}
      <span
        className={cn(
          "relative z-10 max-w-full font-display text-[0.62rem] leading-[1.05] tracking-wide uppercase hyphens-auto [overflow-wrap:anywhere] sm:text-sm md:text-base",
          marked && "text-noite"
        )}
      >
        {cell.text}
      </span>
      {status?.result === "miss" && (
        <span className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-0.5 -rotate-12 bg-papel/80" />
      )}
      {status && <StatusTag status={status} />}
    </div>
  )
}

function StatusTag({ status }: { status: NonNullable<CellStatus> }) {
  const who = status.by === "lula" ? "Lula" : status.by === "flavio" ? "Flávio" : "Ambos"
  const hit = status.result === "hit"
  return (
    <span
      className={cn(
        "absolute top-0.5 left-0.5 z-20 rounded px-1 font-display text-[0.5rem] leading-tight tracking-wider uppercase sm:text-[0.65rem]",
        hit ? "bg-amarelo text-noite" : "bg-noite text-papel ring-1 ring-papel/40"
      )}
    >
      {hit ? "✓" : "✗"} {who}
    </span>
  )
}

function FreeCell({ win }: { win: boolean }) {
  return (
    <div
      className={cn(
        "flex aspect-square flex-col items-center justify-center rounded-lg bg-amarelo text-noite shadow-[inset_0_-3px_0_oklch(0_0_0/0.2)]",
        win && "ring-4 ring-papel"
      )}
    >
      <span className="text-xl sm:text-4xl">🇧🇷</span>
      <span className="font-display text-[0.6rem] tracking-widest sm:text-sm">LIVRE</span>
    </div>
  )
}

function BoardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="rounded-2xl bg-papel/5 p-1.5 ring-1 ring-papel/10 select-none [-webkit-touch-callout:none] [-webkit-user-select:none] sm:p-3"
    >
      <div className="mb-1.5 grid grid-cols-5 gap-1.5 sm:mb-2 sm:gap-2">
        {"BINGO".split("").map((l, i) => (
          <span
            key={l}
            className={cn("text-center font-display text-2xl sm:text-4xl", i % 2 === 0 ? "text-pt" : "text-verde")}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">{children}</div>
      <div className="mt-2 flex justify-center gap-4 font-display text-xs tracking-widest uppercase sm:text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-pt" /> Lula fala
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-verde" /> Flávio fala
        </span>
      </div>
    </div>
  )
}

/** Play/view mode: tap to mark. */
export function PlayBoard({
  slots,
  marked,
  said,
  onToggle,
}: {
  slots: Cell[]
  marked: Set<number>
  said: Set<string>
  onToggle?: (i: number) => void
}) {
  const winning = new Set(score(marked).lines.flat())
  return (
    <BoardFrame>
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        if (i === CENTER) return <FreeCell key={i} win={winning.has(i)} />
        const cell = slots[boardToSlot(i)]
        return (
          <button
            key={i}
            type="button"
            disabled={!onToggle}
            onClick={() => onToggle?.(i)}
            aria-pressed={marked.has(i)}
            className={cn(
              "aspect-square rounded-lg transition-transform",
              onToggle && "cursor-pointer hover:-translate-y-0.5 active:scale-95",
              winning.has(i) && "rounded-xl ring-4 ring-amarelo"
            )}
          >
            <CellFace cell={cell} tone={toneOf(i)} marked={marked.has(i)} status={cellStatus(cell, i, said)} />
          </button>
        )
      })}
    </BoardFrame>
  )
}

type BuildProps = {
  slots: Slots
  onClear: (slot: number) => void
  /** Empty square picked by tapping: the next phrase goes there. */
  target?: number | null
  onTarget?: (slot: number) => void
  /** Filled square picked by tapping: the next square tapped swaps with it. */
  moving?: number | null
  onPick?: (slot: number) => void
  said?: Set<string>
}

/** Build mode: every slot is a drop target, filled slots can be dragged around. */
export function BuildBoard({ slots, onClear, target, onTarget, moving, onPick, said }: BuildProps) {
  return (
    <BoardFrame>
      {Array.from({ length: SIZE * SIZE }, (_, i) =>
        i === CENTER ? (
          <FreeCell key={i} win={false} />
        ) : (
          <BuildSlot
            key={i}
            index={i}
            cell={slots[boardToSlot(i)]}
            onClear={onClear}
            target={target}
            onTarget={onTarget}
            moving={moving}
            onPick={onPick}
            said={said}
          />
        )
      )}
    </BoardFrame>
  )
}

function BuildSlot({
  index,
  cell,
  onClear,
  target,
  onTarget,
  moving,
  onPick,
  said,
}: { index: number; cell: Cell | null } & Omit<BuildProps, "slots">) {
  const slot = boardToSlot(index)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `slot:${slot}` })
  const {
    setNodeRef: setDragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({ id: `cell:${slot}`, data: { cell }, disabled: !cell })
  const tone = toneOf(index)

  return (
    <div
      ref={setDropRef}
      className={cn(
        "relative aspect-square rounded-lg transition-transform",
        isOver && "scale-105 ring-4 ring-amarelo",
        moving === slot && "z-10 scale-105 rounded-xl ring-4 ring-amarelo",
        moving != null && moving !== slot && "animate-pulse"
      )}
    >
      {cell ? (
        <div
          ref={setDragRef}
          {...listeners}
          {...attributes}
          onClick={() => onPick?.(slot)}
          className={cn(
            "size-full cursor-grab rounded-lg active:cursor-grabbing",
            isDragging && "opacity-30"
          )}
        >
          <CellFace
            cell={cell}
            tone={tone}
            status={said ? cellStatus(cell, index, said) : null}
            marked={said ? cellStatus(cell, index, said)?.result === "hit" : false}
          />
          <button
            type="button"
            aria-label="Tirar"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onClear(slot)
            }}
            className="absolute top-0 right-0 z-20 rounded-bl-lg rounded-tr-lg bg-noite/70 p-1 text-papel hover:bg-noite"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onTarget?.(slot)}
          aria-label="Escolher este quadrado"
          aria-pressed={target === slot}
          className={cn(
            "flex size-full flex-col items-center justify-center rounded-lg border-2 border-dashed font-display transition-colors",
            tone === "pt" ? "border-pt/60 bg-pt/10 text-pt/70" : "border-verde/60 bg-verde/10 text-verde/70",
            target === slot && (tone === "pt" ? "border-solid bg-pt/45 text-papel" : "border-solid bg-verde/45 text-papel")
          )}
        >
          <span className="text-xl">+</span>
        </button>
      )}
    </div>
  )
}

export function ScoreBanner({ marked, misses = 0 }: { marked: Set<number>; misses?: number }) {
  const { hits, lines, full, points } = score(marked)
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors",
        lines.length ? "bg-amarelo text-noite" : "bg-card ring-1 ring-border"
      )}
    >
      <div className="flex flex-col">
        <span className="font-display text-2xl leading-none tracking-wide uppercase sm:text-3xl">
          {full ? "Cartela cheia! 🏆" : lines.length ? `Bingo!${lines.length > 1 ? ` ×${lines.length}` : ""} 🎉` : "Placar"}
        </span>
        <span className="mt-1 flex gap-3 text-sm font-semibold tabular-nums">
          <span>✓ {hits} acerto{hits === 1 ? "" : "s"}</span>
          <span className="opacity-70">✗ {misses} erro{misses === 1 ? "" : "s"}</span>
          {lines.length > 0 && <span>▦ {lines.length} linha{lines.length === 1 ? "" : "s"}</span>}
        </span>
      </div>
      <span className="flex items-baseline gap-1">
        <strong className="font-display text-4xl tabular-nums sm:text-5xl">{points}</strong>
        <span className="text-sm opacity-70">pts</span>
      </span>
    </div>
  )
}

export function Legend() {
  return (
    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
      <Check className="size-3.5" /> Vale se sair da boca da cor do quadrado · 1 pt · +5 por linha · +25 cartela
      cheia
    </p>
  )
}
