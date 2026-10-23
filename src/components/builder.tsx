"use client"

import { useState } from "react"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { Dices, Eraser, Plus } from "lucide-react"

import { BuildBoard, CellFace } from "@/components/board"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { POOL, SPEAKERS, type Speaker } from "@/lib/phrases"
import { type Cell, type Slots, SLOTS, emptySlots, fillEmpty } from "@/lib/card"

type Props = {
  slots: Slots
  onChange: (slots: Slots) => void
}

const dot: Record<Speaker, string> = { lula: "bg-pt", flavio: "bg-verde", geral: "bg-amarelo" }

export function Builder({ slots, onChange }: Props) {
  const [dragging, setDragging] = useState<Cell | null>(null)
  const [custom, setCustom] = useState("")
  const [customSpeaker, setCustomSpeaker] = useState<Speaker>("geral")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  )

  const used = new Set(slots.flatMap((c) => (c ? [c.text.toLowerCase()] : [])))
  const filled = slots.filter(Boolean).length
  const full = filled === SLOTS

  const put = (cell: Cell) => {
    const free = slots.indexOf(null)
    if (free === -1 || used.has(cell.text.toLowerCase())) return
    onChange(slots.map((c, i) => (i === free ? cell : c)))
  }

  const clear = (slot: number) => onChange(slots.map((c, i) => (i === slot ? null : c)))

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.cell as Cell) ?? null)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    if (!over) return
    const cell = active.data.current?.cell as Cell
    const from = String(active.id).startsWith("cell:") ? Number(String(active.id).slice(5)) : null
    const target = String(over.id)

    if (target === "pool") {
      if (from !== null) clear(from)
      return
    }
    const to = Number(target.slice(5))
    const next = [...slots]
    if (from !== null) {
      ;[next[from], next[to]] = [next[to], next[from]]
    } else {
      next[to] = cell
    }
    onChange(next)
  }

  const addCustom = () => {
    const text = custom.trim().slice(0, 40)
    if (!text || full) return
    put({ text, speaker: customSpeaker })
    setCustom("")
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-xl tracking-wide uppercase">
              Sua cartela{" "}
              <span className={cn("tabular-nums", full ? "text-amarelo" : "text-muted-foreground")}>
                {filled}/{SLOTS}
              </span>
            </span>
            <div className="flex gap-1.5">
              {filled > 0 && (
                <Button variant="ghost" size="sm" onClick={() => onChange(emptySlots())}>
                  <Eraser /> Limpar
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => onChange(fillEmpty(slots))} disabled={full}>
                <Dices /> Completar
              </Button>
            </div>
          </div>
          <BuildBoard slots={slots} onClear={clear} />
          <p className="text-center text-xs text-muted-foreground">
            Arraste as palavras pra cartela · arraste dentro dela pra trocar de lugar · toque pra tirar
          </p>
        </div>

        <Pool used={used} full={full} onPick={put}>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addCustom()
            }}
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Escreve a sua…"
              maxLength={40}
              className="h-9 min-w-0 flex-1 rounded-lg border bg-background/60 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <select
              value={customSpeaker}
              onChange={(e) => setCustomSpeaker(e.target.value as Speaker)}
              className="h-9 rounded-lg border bg-background px-2 text-sm"
            >
              {(Object.keys(SPEAKERS) as Speaker[]).map((s) => (
                <option key={s} value={s}>
                  {SPEAKERS[s].label}
                </option>
              ))}
            </select>
            <Button type="submit" size="lg" disabled={full || !custom.trim()}>
              <Plus /> Pôr
            </Button>
          </form>
        </Pool>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="size-20 rotate-3 drop-shadow-2xl sm:size-28">
            <CellFace cell={dragging} tone={dragging.speaker === "flavio" ? "verde" : "pt"} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Pool({
  used,
  full,
  onPick,
  children,
}: {
  used: Set<string>
  full: boolean
  onPick: (cell: Cell) => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" })
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-5 rounded-2xl bg-card/60 p-4 ring-1 ring-border transition-colors",
        isOver && "ring-2 ring-pt bg-pt/10"
      )}
    >
      {(Object.keys(POOL) as Speaker[]).map((speaker) => (
        <div key={speaker} className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 font-display text-sm tracking-widest text-muted-foreground uppercase">
            <span className={cn("size-2.5 rounded-full", dot[speaker])} />
            {speaker === "geral" ? "Qualquer um / mediação" : `${SPEAKERS[speaker].label} vai falar`}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {POOL[speaker]
              .filter((text) => !used.has(text.toLowerCase()))
              .map((text) => (
                <PoolChip key={text} cell={{ text, speaker }} disabled={full} onPick={onPick} />
              ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h3 className="font-display text-sm tracking-widest text-muted-foreground uppercase">
          Tem uma melhor?
        </h3>
        {children}
      </div>
    </section>
  )
}

function PoolChip({ cell, disabled, onPick }: { cell: Cell; disabled: boolean; onPick: (cell: Cell) => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `pool:${cell.text}`,
    data: { cell },
    disabled,
  })
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onPick(cell)}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 font-display text-sm tracking-wide uppercase transition-all select-none hover:-translate-y-0.5 hover:border-amarelo disabled:opacity-40",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      <span className={cn("size-2 rounded-full", dot[cell.speaker])} />
      {cell.text}
    </button>
  )
}
