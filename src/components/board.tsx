"use client"

import { useDraggable, useDroppable } from "@dnd-kit/core"
import { Check, PenLine, X } from "lucide-react"

import { Flag, Star } from "@/components/star"
import { cn } from "@/lib/utils"
import { type Cell, CENTER, SIZE, type Slots, boardToSlot, cellSaid, score, speakerAt } from "@/lib/card"

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
        <Flag className="pointer-events-none absolute -right-3 -bottom-2 w-14 -rotate-12 text-papel/15 sm:w-20" />
      )}
      {cell.custom && (
        <PenLine className="pointer-events-none absolute bottom-1 left-1 size-2.5 opacity-60 sm:size-3" />
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
      {saiu && (
        <span className="absolute top-0.5 right-0.5 z-10 rounded bg-amarelo px-1 font-display text-[0.5rem] tracking-wider text-noite sm:text-[0.6rem]">
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
            <CellFace cell={cell} tone={toneOf(i)} marked={marked.has(i)} saiu={cellSaid(cell, i, said)} />
          </button>
        )
      })}
    </BoardFrame>
  )
}

type BuildProps = {
  slots: Slots
  onClear: (slot: number) => void
  /** Once the list quota is used up, empty squares can only take the player's own phrases. */
  ownOnly?: boolean
  /** Empty square picked by tapping: the next phrase goes there. */
  target?: number | null
  onTarget?: (slot: number) => void
}

/** Build mode: every slot is a drop target, filled slots can be dragged around. */
export function BuildBoard({ slots, onClear, ownOnly, target, onTarget }: BuildProps) {
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
            ownOnly={ownOnly}
            target={target}
            onTarget={onTarget}
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
  ownOnly,
  target,
  onTarget,
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
      className={cn("relative aspect-square rounded-lg transition-transform", isOver && "scale-105 ring-4 ring-amarelo")}
    >
      {cell ? (
        <div
          ref={setDragRef}
          {...listeners}
          {...attributes}
          className={cn(
            "size-full cursor-grab rounded-lg active:cursor-grabbing",
            isDragging && "opacity-30"
          )}
        >
          <CellFace cell={cell} tone={tone} />
          <button
            type="button"
            aria-label="Tirar"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onClear(slot)}
            className="absolute top-0.5 right-0.5 z-20 rounded bg-noite/70 p-0.5 text-papel hover:bg-noite"
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
            ownOnly && "border-amarelo/70 text-amarelo",
            target === slot && (tone === "pt" ? "border-solid bg-pt/45 text-papel" : "border-solid bg-verde/45 text-papel")
          )}
        >
          {ownOnly ? (
            <>
              <PenLine className="size-4 sm:size-5" />
              <span className="text-[0.55rem] tracking-widest sm:text-xs">SUA</span>
            </>
          ) : (
            <span className="text-xl">+</span>
          )}
        </button>
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
      <Check className="size-3.5" /> Vale se sair da boca da cor do quadrado · 1 pt · +5 por linha · +25 cartela
      cheia
    </p>
  )
}
