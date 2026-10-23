"use client"

import { useState } from "react"
import { Dices, Lock, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { POOL, SPEAKERS, type Speaker } from "@/lib/phrases"
import { type Cell, SLOTS, shuffle } from "@/lib/card"

type Props = {
  onLock: (name: string, cells: Cell[]) => void
}

const ALL: Cell[] = (Object.keys(POOL) as Speaker[]).flatMap((speaker) =>
  POOL[speaker].map((text) => ({ text, speaker }))
)

export function Builder({ onLock }: Props) {
  const [name, setName] = useState("")
  const [picked, setPicked] = useState<Cell[]>([])
  const [custom, setCustom] = useState("")
  const [customSpeaker, setCustomSpeaker] = useState<Speaker>("geral")

  const isPicked = (text: string) => picked.some((c) => c.text === text)
  const full = picked.length >= SLOTS

  const toggle = (cell: Cell) =>
    setPicked((p) =>
      p.some((c) => c.text === cell.text)
        ? p.filter((c) => c.text !== cell.text)
        : p.length < SLOTS
          ? [...p, cell]
          : p
    )

  const fillRandom = () =>
    setPicked((p) => [...p, ...shuffle(ALL.filter((c) => !p.some((x) => x.text === c.text)))].slice(0, SLOTS))

  const addCustom = () => {
    const text = custom.trim().slice(0, 80)
    if (!text || full || isPicked(text)) return
    setPicked((p) => [...p, { text, speaker: customSpeaker }])
    setCustom("")
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium">
          Seu nome
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          placeholder="Pra galera saber de quem é a cartela"
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">
            Escolha seus palpites{" "}
            <span className={cn("tabular-nums", full ? "text-emerald-600" : "text-muted-foreground")}>
              {picked.length}/{SLOTS}
            </span>
          </h2>
          <div className="flex gap-2">
            {picked.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setPicked([])}>
                Limpar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fillRandom} disabled={full}>
              <Dices /> Completar no aleatório
            </Button>
          </div>
        </div>

        {(Object.keys(POOL) as Speaker[]).map((speaker) => (
          <div key={speaker} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <span className={cn("h-3 w-1 rounded", SPEAKERS[speaker].chip)} />
              {speaker === "geral" ? "Qualquer um / mediação" : `${SPEAKERS[speaker].label} vai falar…`}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {POOL[speaker].map((text) => {
                const on = isPicked(text)
                return (
                  <button
                    key={text}
                    type="button"
                    onClick={() => toggle({ text, speaker })}
                    disabled={!on && full}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-40",
                      on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    {text}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Tem uma melhor? Escreve aí</h3>
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
            placeholder="Ex.: “vou fazer o L ao vivo”"
            maxLength={80}
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <Button type="submit" variant="outline" size="lg" disabled={full || !custom.trim()}>
            <Plus /> Adicionar
          </Button>
        </form>
      </section>

      {picked.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Sua cartela (toque pra tirar)</h3>
          <div className="flex flex-wrap gap-1.5">
            {picked.map((c) => (
              <button
                key={c.text}
                type="button"
                onClick={() => toggle(c)}
                className={cn(
                  "flex items-center gap-1 rounded-md border border-l-4 bg-card px-2 py-1 text-xs hover:bg-accent",
                  SPEAKERS[c.speaker].bar
                )}
              >
                {c.text} <X className="size-3 opacity-50" />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="sticky bottom-4 z-10">
        <Button
          size="lg"
          className="h-12 w-full text-base shadow-lg"
          disabled={!full}
          onClick={() => onLock(name.trim(), shuffle(picked))}
        >
          <Lock />
          {full ? "Travar palpites e gerar cartela" : `Faltam ${SLOTS - picked.length} palpites`}
        </Button>
      </div>
    </div>
  )
}
