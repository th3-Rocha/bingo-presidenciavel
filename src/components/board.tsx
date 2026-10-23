"use client"

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { Check } from "lucide-react"

import { Star } from "@/components/star"
import { cn } from "@/lib/utils"
import { type Cell, CENTER, SIZE, type Slots, boardToSlot, normalize, score } from "@/lib/card"

type Tone = "pt" | "verde"

const toneOf = (i: number): Tone => ((Math.floor(i / SIZE) + (i % SIZE)) % 2 === 0 ? "pt" : "verde")

const toneBg: Record<Tone, string> = {
  pt: "bg-pt text-papel",
  verde: "bg-verde text-papel",
}

/** The tile itself: checkerboard color, decoration, text, dauber when marked. */
export function CellFace({
  cell,
  tone,
  marked = false,
  saiu = false,
  className,
}: {
  cell: Cell
  tone: Tone
  marked?: boolean
  saiu?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex size-full items-center justify-center overflow-hidden rounded-lg p-1 text-center shadow-[inset_0_-3px_0_oklch(0_0_0/0.2)] sm:p-2",
        toneBg[tone],
        saiu && "saiu",
        className
      )}
    >
      {tone === "pt" ? (
        <Star className="pointer-events-none absolute -right-2 -bottom-2 size-10 text-papel/15 sm:size-14" />
      ) : (
        <span className="pointer-events-none absolute right-1 bottom-0.5 text-[0.6rem] opacity-60 sm:text-sm">
          🇧🇷
        </span>
      )}
      {marked && (
        <span className="stamp pointer-events-none absolute inset-[8%] rounded-full bg-amarelo/90 shadow-lg" />
      )}
      <span
        className={cn(
          "relative z-10 max-w-full font-display text-[0.62rem] leading-[1.05] hyphens-auto [overflow-wrap:anywhere] tracking-wide uppercase sm:text-sm md:text-base",
          marked && "text-noite"
        )}
      >
        {cell.text}
      </span>
      {saiu && (
        <span className="absolute top-0.5 left-0.5 z-10 rounded bg-amarelo px-1 font-display text-[0.5rem] tracking-wider text-noite sm:text-[0.6rem]">
          SAIU
        </span>
      )}
    </div>
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
    <div className="rounded-2xl bg-papel/5 p-1.5 ring-1 ring-papel/10 sm:p-3">
      <div className="mb-1.5 grid grid-cols-5 gap-1.5 sm:mb-2 sm:gap-2">
        {"BINGO".split("").map((l, i) => (
          <span
            key={l}
            className={cn(
              "text-center font-display text-2xl sm:text-4xl",
              i % 2 === 0 ? "text-pt" : "text-verde"
            )}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">{children}</div>
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
            <CellFace
              cell={cell}
              tone={toneOf(i)}
              marked={marked.has(i)}
              saiu={said.has(normalize(cell.text))}
            />
          </button>
        )
      })}
    </BoardFrame>
  )
}

/** Build mode: every slot is a drop target, filled slots can be dragged around. */
export function BuildBoard({ slots, onClear }: { slots: Slots; onClear: (slot: number) => void }) {
  return (
    <BoardFrame>
      {Array.from({ length: SIZE * SIZE }, (_, i) =>
        i === CENTER ? (
          <FreeCell key={i} win={false} />
        ) : (
          <BuildSlot key={i} index={i} cell={slots[boardToSlot(i)]} onClear={onClear} />
        )
      )}
    </BoardFrame>
  )
}

function BuildSlot({ index, cell, onClear }: { index: number; cell: Cell | null; onClear: (slot: number) => void }) {
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
        isOver && "scale-105 ring-4 ring-amarelo"
      )}
    >
      {cell ? (
        <button
          ref={setDragRef}
          type="button"
          {...listeners}
          {...attributes}
          onClick={() => onClear(slot)}
          title="Arraste pra trocar de lugar · toque pra tirar"
          className={cn("size-full cursor-grab active:cursor-grabbing", isDragging && "opacity-30")}
        >
          <CellFace cell={cell} tone={tone} />
        </button>
      ) : (
        <div
          className={cn(
            "flex size-full items-center justify-center rounded-lg border-2 border-dashed font-display text-xl",
            tone === "pt" ? "border-pt/60 bg-pt/10 text-pt/70" : "border-verde/60 bg-verde/10 text-verde/70"
          )}
        >
          +
        </div>
      )}
    </div>
  )
}

export function ScoreBanner({ marked }: { marked: Set<number> }) {
  const { hits, lines, full, points } = score(marked)
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors",
        lines.length ? "bg-amarelo text-noite" : "bg-card ring-1 ring-border"
      )}
    >
      <span className="font-display text-2xl tracking-wide uppercase sm:text-3xl">
        {full ? "Cartela cheia! 🏆" : lines.length ? `Bingo!${lines.length > 1 ? ` ×${lines.length}` : ""} 🎉` : `${hits}/24 acertos`}
      </span>
      <span className="flex items-baseline gap-1">
        <strong className="font-display text-3xl tabular-nums sm:text-4xl">{points}</strong>
        <span className="text-sm opacity-70">pts</span>
      </span>
    </div>
  )
}

export function Legend() {
  return (
    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
      <Check className="size-3.5" /> 1 pt por acerto · +5 por linha · +25 cartela cheia
    </p>
  )
}
