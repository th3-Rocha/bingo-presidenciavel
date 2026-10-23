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
import { Dices, Eraser, Search } from "lucide-react"

import { BuildBoard, CellFace } from "@/components/board"
import { Flag, Star } from "@/components/star"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { POOL, type Speaker } from "@/lib/phrases"
import {
  type Cell,
  type Slots,
  SLOTS,
  emptySlots,
  fillEmpty,
  normalize,
  progress,
  slotToBoard,
  speakerAt,
} from "@/lib/card"

type Props = {
  slots: Slots
  onChange: (slots: Slots) => void
}

export function Builder({ slots, onChange }: Props) {
  const [dragging, setDragging] = useState<Cell | null>(null)
  const [side, setSide] = useState<Speaker>("lula")
  const [target, setTarget] = useState<number | null>(null)
  const [nope, setNope] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  )

  const used = new Set(slots.flatMap((c) => (c ? [normalize(c.text)] : [])))
  const p = progress(slots)
  const full = p.filled >= SLOTS
  const freeOf = (s: Speaker) => slots.filter((c, i) => !c && speakerAt(slotToBoard(i)) === s).length

  // Tapping: goes to the picked square, else the next free square of the chosen color.
  const put = (cell: Cell) => {
    if (used.has(normalize(cell.text))) return false
    const at =
      target !== null && !slots[target]
        ? target
        : slots.findIndex((c, i) => !c && speakerAt(slotToBoard(i)) === side)
    if (at === -1) {
      setNope(true)
      setTimeout(() => setNope(false), 600)
      return false
    }
    onChange(slots.map((c, i) => (i === at ? cell : c)))
    setTarget(null)
    return true
  }

  const clear = (slot: number) => onChange(slots.map((c, i) => (i === slot ? null : c)))

  const pickTarget = (slot: number) => {
    setTarget((t) => (t === slot ? null : slot))
    setSide(speakerAt(slotToBoard(slot)))
  }

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.cell as Cell) ?? null)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    if (!over) return
    const cell = active.data.current?.cell as Cell
    const from = String(active.id).startsWith("cell:") ? Number(String(active.id).slice(5)) : null
    const dest = String(over.id)

    if (dest === "pool") {
      if (from !== null) clear(from)
      return
    }
    const to = Number(dest.slice(5))
    if (from !== null) {
      const next = [...slots]
      ;[next[from], next[to]] = [next[to], next[from]]
      onChange(next)
      return
    }
    onChange(slots.map((c, i) => (i === to ? cell : c)))
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl tracking-wide uppercase">
              Sua cartela{" "}
              <span className={cn("tabular-nums", p.complete ? "text-amarelo" : "text-muted-foreground")}>
                {p.filled}/{SLOTS}
              </span>
            </h2>
            <div className="flex gap-1">
              {p.filled > 0 && (
                <Button variant="ghost" size="sm" onClick={() => onChange(emptySlots())}>
                  <Eraser /> <span className="hidden sm:inline">Limpar</span>
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => onChange(fillEmpty(slots))} disabled={full}>
                <Dices /> Completar
              </Button>
            </div>
          </div>
          <BuildBoard
            slots={slots}
            onClear={clear}
            target={target}
            onTarget={pickTarget}
          />
          <Checklist {...p} />
        </div>

        <div className="flex flex-col gap-4">
          <SidePicker
            side={side}
            onSide={(s) => {
              setSide(s)
              setTarget(null)
            }}
            free={{ lula: freeOf("lula"), flavio: freeOf("flavio") }}
            nope={nope}
            target={target !== null}
          />


          <Pool used={used} disabled={full} onPick={put} />
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

function SidePicker({
  side,
  onSide,
  free,
  nope,
  target,
}: {
  side: Speaker
  onSide: (s: Speaker) => void
  free: Record<Speaker, number>
  nope: boolean
  target: boolean
}) {
  const options = [
    { s: "lula" as const, label: "Lula", Icon: Star, on: "bg-pt text-papel ring-pt", off: "text-pt" },
    { s: "flavio" as const, label: "Flávio", Icon: Flag, on: "bg-verde text-papel ring-verde", off: "text-verde" },
  ]
  return (
    <div className={cn("flex flex-col gap-2", nope && "animate-[shake_0.3s_ease-in-out_2]")}>
      <p className="text-sm text-muted-foreground">
        {target ? "Agora toque na frase pro quadrado escolhido." : "Toque numa frase pra pôr no quadrado de quem vai falar:"}
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card/60 p-1.5 ring-1 ring-border">
        {options.map(({ s, label, Icon, on, off }) => (
          <button
            key={s}
            type="button"
            onClick={() => onSide(s)}
            aria-pressed={side === s}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 font-display text-lg tracking-wider uppercase transition-all",
              side === s ? cn(on, "shadow-lg") : cn(off, "hover:bg-secondary")
            )}
          >
            <Icon className={cn("shrink-0", s === "lula" ? "size-4" : "w-6")} />
            {label}
            <span className={cn("text-xs tabular-nums", side === s ? "opacity-80" : "opacity-60")}>
              {free[s]} vagas
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Checklist({ complete }: ReturnType<typeof progress>) {
  return complete ? (
    <p className="text-center font-display tracking-wider text-amarelo uppercase">Cartela pronta! Manda pra galera 👇</p>
  ) : (
    <p className="hidden text-center text-xs text-muted-foreground sm:block">
      Arraste as frases pra cartela · arraste dentro pra trocar de lado · × tira
    </p>
  )
}

function Pool({ used, disabled, onPick }: { used: Set<string>; disabled: boolean; onPick: (cell: Cell) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" })
  const [query, setQuery] = useState("")
  const q = normalize(query)
  const items = POOL.filter((text) => !used.has(normalize(text)) && normalize(text).includes(q))

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-card/60 p-4 ring-1 ring-border transition-colors",
        isOver && "bg-pt/10 ring-2 ring-pt"
      )}
    >
      <div className="flex items-center gap-3">
        <h3 className="font-display text-lg tracking-widest uppercase">Frases</h3>
        <label className="ml-auto flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border bg-background/60 px-3 sm:max-w-56">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>
      <div className="-mx-1 flex max-h-[45vh] flex-wrap content-start gap-1.5 overflow-y-auto px-1 pb-1 lg:max-h-[60vh]">
        {items.map((text) => (
          <PoolChip key={text} text={text} disabled={disabled} onPick={onPick} />
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nada com “{query}”.</p>}
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
        "rounded-full border border-border bg-secondary px-3 py-2 font-display text-sm tracking-wide uppercase transition-all select-none hover:border-amarelo active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:cursor-grab sm:py-1.5 sm:hover:-translate-y-0.5",
        isDragging && "opacity-30"
      )}
    >
      {text}
    </button>
  )
}
