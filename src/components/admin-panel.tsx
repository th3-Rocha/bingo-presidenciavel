"use client"

import { useEffect, useState } from "react"
import { Plus, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLive } from "@/hooks/use-live"
import { cn } from "@/lib/utils"
import { normalize } from "@/lib/card"
import { POOL, SPEAKERS, type Speaker } from "@/lib/phrases"

const TOKEN_KEY = "bingo-admin-token"
const dot: Record<Speaker, string> = { lula: "bg-pt", flavio: "bg-verde", geral: "bg-amarelo" }

export function AdminPanel() {
  const live = useLive()
  const [token, setToken] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [custom, setCustom] = useState("")
  const [customSpeaker, setCustomSpeaker] = useState<Speaker>("geral")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(localStorage.getItem(TOKEN_KEY))
    } catch {}
  }, [])

  const call = async (key: string, init: RequestInit & { path?: string }) => {
    setBusy(key)
    setError(null)
    try {
      const res = await fetch(init.path ?? "/api/events", {
        ...init,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        setError("Senha errada")
        setToken(null)
        try {
          localStorage.removeItem(TOKEN_KEY)
        } catch {}
      } else if (!res.ok) setError(`Erro ${res.status}`)
      return res.ok
    } catch {
      setError("Sem conexão")
      return false
    } finally {
      setBusy(null)
    }
  }

  const send = (text: string, speaker: Speaker | null) =>
    call(text, { method: "POST", body: JSON.stringify({ text, speaker }) })

  const undo = (id: number) => call(`del:${id}`, { method: "DELETE", path: `/api/events?id=${id}` })

  if (!token) {
    return (
      <form
        className="flex max-w-sm flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          try {
            localStorage.setItem(TOKEN_KEY, draft)
          } catch {}
          setToken(draft)
        }}
      >
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Senha"
          autoFocus
          className="h-11 rounded-lg border bg-card px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {error && <p className="text-sm text-pt">{error}</p>}
        <Button size="lg" type="submit" className="h-11 font-display tracking-wider uppercase">
          Entrar
        </Button>
      </form>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          Toque quando sair. Aparece pra todo mundo em ~5s e marca as cartelas sozinho.
          {error && <span className="ml-2 font-semibold text-pt">{error}</span>}
        </p>
        {(Object.keys(POOL) as Speaker[]).map((speaker) => (
          <div key={speaker} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 font-display text-sm tracking-widest text-muted-foreground uppercase">
              <span className={cn("size-2.5 rounded-full", dot[speaker])} /> {SPEAKERS[speaker].label}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {POOL[speaker].map((text) => {
                const done = live.said.has(normalize(text))
                return (
                  <button
                    key={text}
                    type="button"
                    disabled={done || busy === text}
                    onClick={() => send(text, speaker)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 font-display text-sm tracking-wide uppercase transition-colors",
                      done ? "border-amarelo bg-amarelo text-noite" : "border-border bg-secondary hover:border-amarelo",
                      busy === text && "animate-pulse"
                    )}
                  >
                    {text}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <form
          className="flex flex-wrap gap-2 border-t border-border pt-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const text = custom.trim()
            if (text && (await send(text, customSpeaker))) setCustom("")
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Outra fala (bate com as cartelas que escreveram igual)"
            maxLength={40}
            className="h-9 min-w-0 flex-1 rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <Button type="submit" size="lg" disabled={!custom.trim()}>
            <Plus /> Soltar
          </Button>
        </form>
      </div>

      <section className="flex flex-col gap-2 rounded-2xl bg-card/60 p-4 ring-1 ring-border md:sticky md:top-4">
        <h2 className="font-display text-lg tracking-widest uppercase">Feed ({live.events.length})</h2>
        {[...live.events].reverse().map((e) => (
          <div key={e.id} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <span className="font-mono text-xs text-muted-foreground">#{e.id}</span>
            <span className="font-display tracking-wide uppercase">{e.text}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              disabled={busy === `del:${e.id}`}
              onClick={() => undo(e.id)}
            >
              <Undo2 /> Desfazer
            </Button>
          </div>
        ))}
      </section>
    </div>
  )
}
