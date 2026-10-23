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
import { Dices, Eraser, PenLine, Plus } from "lucide-react"

import { BuildBoard, CellFace } from "@/components/board"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { POOL } from "@/lib/phrases"
import {
  type Cell,
  CUSTOM_REQUIRED,
  LIST_MAX,
  type Slots,
  SLOTS,
  emptySlots,
  fillFromList,
  normalize,
  progress,
} from "@/lib/card"

type Props = {
  slots: Slots
  onChange: (slots: Slots) => void
}

export function Builder({ slots, onChange }: Props) {
  const [dragging, setDragging] = useState<Cell | null>(null)
  const [custom, setCustom] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  )

  const used = new Set(slots.flatMap((c) => (c ? [normalize(c.text)] : [])))
  const p = progress(slots)
  const listFull = p.list >= LIST_MAX || p.filled >= SLOTS
  const customFull = p.custom >= CUSTOM_REQUIRED || p.filled >= SLOTS

  const put = (cell: Cell, at?: number) => {
    const target = at ?? slots.indexOf(null)
    if (target === -1 || used.has(normalize(cell.text))) return
    onChange(slots.map((c, i) => (i === target ? cell : c)))
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
    if (from !== null) {
      const next = [...slots]
      ;[next[from], next[to]] = [next[to], next[from]]
      onChange(next)
      return
    }
    // Dropping a list phrase onto a filled slot replaces it, so the list cap still holds.
    const replacing = slots[to]
    if (listFull && !(replacing && !replacing.custom)) return
    onChange(slots.map((c, i) => (i === to ? cell : c)))
  }

  const addCustom = () => {
    const text = custom.trim().slice(0, 40)
    if (!text || customFull || used.has(normalize(text))) return
    put({ text, custom: true })
    setCustom("")
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-xl tracking-wide uppercase">
              Sua cartela{" "}
              <span className={cn("tabular-nums", p.complete ? "text-amarelo" : "text-muted-foreground")}>
                {p.filled}/{SLOTS}
              </span>
            </span>
            <div className="flex gap-1.5">
              {p.filled > 0 && (
                <Button variant="ghost" size="sm" onClick={() => onChange(emptySlots())}>
                  <Eraser /> Limpar
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onChange(fillFromList(slots))}
                disabled={listFull}
              >
                <Dices /> Completar
              </Button>
            </div>
          </div>
          <BuildBoard slots={slots} onClear={clear} ownOnly={p.list >= LIST_MAX} />
          <Checklist {...p} />
        </div>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-2xl bg-amarelo/10 p-4 ring-2 ring-amarelo/60">
            <h3 className="flex items-center gap-2 font-display text-lg tracking-widest uppercase">
              <PenLine className="size-4 text-amarelo" /> Tem uma melhor?
              <span className={cn("ml-auto tabular-nums", p.custom >= CUSTOM_REQUIRED ? "text-amarelo" : "text-muted-foreground")}>
                {p.custom}/{CUSTOM_REQUIRED}
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Escreva <strong className="text-papel">{CUSTOM_REQUIRED} frases suas</strong>, obrigatório. Ponha no quadrado
              da cor de quem vai falar.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addCustom()
              }}
            >
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Ex.: Faz o L"
                maxLength={40}
                disabled={customFull}
                className="h-10 min-w-0 flex-1 rounded-lg border bg-background/60 px-3 font-display tracking-wide uppercase outline-none placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              />
              <Button type="submit" size="lg" className="h-10" disabled={customFull || !custom.trim()}>
                <Plus /> Pôr
              </Button>
            </form>
          </section>

          <Pool used={used} disabled={listFull} onPick={(cell) => put(cell)} />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="size-20 rotate-3 drop-shadow-2xl sm:size-28">
            <CellFace cell={dragging} tone="pt" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Checklist({ list, custom, complete }: ReturnType<typeof progress>) {
  if (complete) {
    return (
      <p className="text-center font-display tracking-wider text-amarelo uppercase">
        Cartela pronta! Manda pra galera 👇
      </p>
    )
  }
  const items = [
    { ok: list >= LIST_MAX, text: `${list}/${LIST_MAX} da lista` },
    { ok: custom >= CUSTOM_REQUIRED, text: `${custom}/${CUSTOM_REQUIRED} suas` },
  ]
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap justify-center gap-1.5">
        {items.map((i) => (
          <span
            key={i.text}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              i.ok ? "bg-verde/20 text-verde" : "bg-amarelo/15 text-amarelo"
            )}
          >
            {i.ok ? "✓" : "•"} {i.text}
          </span>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Vermelho = Lula vai falar · verde = Flávio vai falar · arraste dentro pra trocar de lado
      </p>
    </div>
  )
}

function Pool({ used, disabled, onPick }: { used: Set<string>; disabled: boolean; onPick: (cell: Cell) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" })
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-card/60 p-4 ring-1 ring-border transition-colors",
        isOver && "bg-pt/10 ring-2 ring-pt"
      )}
    >
      <h3 className="font-display text-lg tracking-widest uppercase">Frases</h3>
      <div className="flex flex-wrap gap-1.5">
        {POOL.filter((text) => !used.has(normalize(text))).map((text) => (
          <PoolChip key={text} text={text} disabled={disabled} onPick={onPick} />
        ))}
      </div>
    </section>
  )
}

function PoolChip({ text, disabled, onPick }: { text: string; disabled: boolean; onPick: (cell: Cell) => void }) {
  const cell: Cell = { text }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `pool:${text}`,
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
        "cursor-grab rounded-full border border-border bg-secondary px-3 py-1.5 font-display text-sm tracking-wide uppercase transition-all select-none hover:-translate-y-0.5 hover:border-amarelo active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40",
        isDragging && "opacity-30"
      )}
    >
      {text}
    </button>
  )
}
