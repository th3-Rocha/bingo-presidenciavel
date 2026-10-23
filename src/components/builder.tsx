"use client"

import { useRef, useState } from "react"
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
import { useCoarsePointer } from "@/hooks/use-coarse-pointer"
import { Flag, Star } from "@/components/star"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { POOL_GROUPS, type Speaker } from "@/lib/phrases"
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
  said: Set<string>
}

export function Builder({ slots, onChange, said }: Props) {
  const [dragging, setDragging] = useState<Cell | null>(null)
  const [side, setSide] = useState<Speaker>("lula")
  const [target, setTarget] = useState<number | null>(null)
  const [moving, setMoving] = useState<number | null>(null)
  // The click that ends a drag must not also start a tap-to-swap.
  const justDragged = useRef(false)
  const [nope, setNope] = useState(false)

  const pointer = useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  const touch = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  // Phones: a longer press so normal scrolling never turns into a drag.
  const longTouch = useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } })
  const desktopSensors = useSensors(pointer, touch)
  const phoneSensors = useSensors(longTouch)
  // On phones the phrase list is tap-only; squares can still be long-pressed and dragged.
  const coarse = useCoarsePointer()

  const used = new Set(slots.flatMap((c) => (c ? [normalize(c.text)] : [])))
  const p = progress(slots)
  const full = p.filled >= SLOTS
  const freeOf = (s: Speaker) => slots.filter((c, i) => !c && speakerAt(slotToBoard(i)) === s).length

  // Tapping: goes to the picked square, else the next free square of the chosen color.
  // If that color is full it spills over to the other one instead of doing nothing.
  const put = (cell: Cell) => {
    if (used.has(normalize(cell.text))) return false
    const freeSlot = (s: Speaker) => slots.findIndex((c, i) => !c && speakerAt(slotToBoard(i)) === s)
    const other: Speaker = side === "lula" ? "flavio" : "lula"
    let at = target !== null && !slots[target] ? target : freeSlot(side)
    if (at === -1) {
      at = freeSlot(other)
      if (at !== -1) setSide(other)
    }
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

  const swap = (from: number, to: number) => {
    const next = [...slots]
    ;[next[from], next[to]] = [next[to], next[from]]
    onChange(next)
  }

  // Tap a filled square, then any other square: they swap (or it moves into the empty one).
  const pickFilled = (slot: number) => {
    if (justDragged.current) return
    setTarget(null)
    if (moving === null) return setMoving(slot)
    if (moving !== slot) swap(moving, slot)
    setMoving(null)
  }

  const pickTarget = (slot: number) => {
    if (moving !== null) {
      swap(moving, slot)
      setMoving(null)
      return
    }
    setTarget((t) => (t === slot ? null : slot))
    setSide(speakerAt(slotToBoard(slot)))
  }

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.cell as Cell) ?? null)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 0)
    if (!over) return
    const cell = active.data.current?.cell as Cell
    const from = String(active.id).startsWith("cell:") ? Number(String(active.id).slice(5)) : null
    const dest = String(over.id)

    if (dest === "pool") {
      if (from !== null) clear(from)
      return
    }
    const to = Number(dest.slice(5))
    setMoving(null)
    if (from !== null) {
      swap(from, to)
      return
    }
    onChange(slots.map((c, i) => (i === to ? cell : c)))
  }

  return (
    <DndContext
      sensors={coarse ? phoneSensors : desktopSensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl tracking-wide uppercase min-[360px]:text-2xl">
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
            moving={moving}
            onPick={pickFilled}
            said={said}
          />
          {moving !== null && (
            <p className="text-center font-display tracking-wider text-amarelo uppercase">
              Toque em outro quadrado pra trocar ·{" "}
              <button type="button" className="underline" onClick={() => setMoving(null)}>
                cancelar
              </button>
            </p>
          )}
          <Checklist {...p} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
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


          <Pool used={used} disabled={full} dragOff={coarse} onPick={put} />
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
              "flex flex-wrap items-center justify-center gap-x-2 rounded-xl px-1 py-2.5 font-display text-base tracking-wider uppercase transition-all min-[360px]:text-lg",
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

function Pool({
  used,
  disabled,
  dragOff,
  onPick,
}: {
  used: Set<string>
  disabled: boolean
  dragOff: boolean
  onPick: (cell: Cell) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" })
  const [query, setQuery] = useState("")
  const q = normalize(query)
  const groups = POOL_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((text) => !used.has(normalize(text)) && normalize(text).includes(q)),
  })).filter((g) => g.items.length > 0)

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
            className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
          />
        </label>
      </div>
      <div className="-mx-1 flex max-h-[50vh] flex-col gap-4 overflow-y-auto px-1 pb-1 lg:max-h-[65vh]">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-1.5">
            <h4 className="sticky top-0 z-10 -mx-1 bg-card/95 px-1 py-0.5 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
              {g.title}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((text) => (
                <PoolChip key={text} text={text} disabled={disabled} dragOff={dragOff} onPick={onPick} />
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-sm text-muted-foreground">Nada com “{query}”.</p>}
      </div>
    </section>
  )
}

function PoolChip({
  text,
  disabled,
  dragOff,
  onPick,
}: {
  text: string
  disabled: boolean
  dragOff: boolean
  onPick: (cell: Cell) => void
}) {
  const cell: Cell = { text }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `pool:${text}`,
    data: { cell },
    disabled: disabled || dragOff,
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
        "rounded-full border border-border bg-secondary px-3 py-2 font-display [-webkit-touch-callout:none] text-sm tracking-wide uppercase transition-all select-none hover:border-amarelo active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:cursor-grab sm:py-1.5 sm:hover:-translate-y-0.5",
        isDragging && "opacity-30"
      )}
    >
      {text}
    </button>
  )
}
