"use client"

import { cn } from "@/lib/utils"
import { SPEAKERS } from "@/lib/phrases"
import { type Cell, score, toBoard } from "@/lib/card"

type Props = {
  cells: Cell[]
  marked: Set<number>
  onToggle?: (i: number) => void
}

export function Board({ cells, marked, onToggle }: Props) {
  const board = toBoard(cells)
  const { lines } = score(marked)
  const winning = new Set(lines.flat())

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {board.map((cell, i) => {
        const isWin = winning.has(i)
        if (!cell) {
          return (
            <div
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg bg-primary text-center font-black text-primary-foreground",
                isWin && "ring-4 ring-yellow-400"
              )}
            >
              <span className="text-xs leading-tight sm:text-base">
                🇧🇷
                <br />
                LIVRE
              </span>
            </div>
          )
        }
        const isMarked = marked.has(i)
        return (
          <button
            key={i}
            type="button"
            disabled={!onToggle}
            onClick={() => onToggle?.(i)}
            aria-pressed={isMarked}
            className={cn(
              "relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-l-4 bg-card p-1 text-center text-[0.6rem] leading-tight font-medium break-words transition-all select-none sm:p-2 sm:text-xs md:text-sm",
              onToggle && "hover:bg-accent active:scale-95",
              SPEAKERS[cell.speaker].bar,
              isMarked && "bg-primary/10",
              isWin && "bg-yellow-400/25 ring-2 ring-yellow-400"
            )}
          >
            <span className={cn(isMarked && "opacity-60")}>{cell.text}</span>
            {isMarked && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl text-red-600/70 sm:text-6xl">
                ✕
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
      {Object.values(SPEAKERS).map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span className={cn("h-3 w-1 rounded", s.chip)} /> {s.label}
        </span>
      ))}
    </div>
  )
}

export function ScoreBanner({ marked }: { marked: Set<number> }) {
  const { hits, lines, full, points } = score(marked)
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 transition-colors",
        lines.length ? "border-yellow-400 bg-yellow-400/15" : "border-dashed border-border"
      )}
    >
      <span className="text-xl font-black tracking-wide sm:text-2xl">
        {full ? "CARTELA CHEIA! 🏆" : lines.length ? `BINGO!${lines.length > 1 ? ` ×${lines.length}` : ""} 🎉` : `${hits}/24 acertos`}
      </span>
      <span className="text-sm text-muted-foreground">
        <strong className="text-2xl font-black text-foreground tabular-nums">{points}</strong> pts
      </span>
    </div>
  )
}
