"use client"

import { useEffect, useState } from "react"
import { Search, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLive } from "@/hooks/use-live"
import { cn } from "@/lib/utils"
import { normalize, saidKey } from "@/lib/card"
import { POOL, type Speaker } from "@/lib/phrases"

const TOKEN_KEY = "bingo-admin-token"

type Who = Speaker | null
const WHO: { who: Who; label: string; on: string }[] = [
  { who: "lula", label: "Lula", on: "bg-pt text-papel" },
  { who: "flavio", label: "Flávio", on: "bg-verde text-papel" },
  { who: null, label: "Ambos", on: "bg-amarelo text-noite" },
]

export function AdminPanel() {
  const live = useLive()
  const [token, setToken] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
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

  const send = (text: string, speaker: Who) =>
    call(saidKey(text, speaker), { method: "POST", body: JSON.stringify({ text, speaker }) })

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

  const q = normalize(query)
  const phrases = POOL.filter((t) => normalize(t).includes(q))
  // Typed text that isn't in the list can still be sent: it matches players' own phrases.
  const freeText = query.trim() && !POOL.some((t) => normalize(t) === q) ? query.trim().slice(0, 40) : null

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Toque em quem falou. Aparece pra todo mundo em ~5s e marca as cartelas de quem apostou nele. &quot;Ambos&quot;
          vale pras duas apostas.
          {error && <span className="ml-2 font-semibold text-pt">{error}</span>}
        </p>
        <label className="flex h-11 items-center gap-2 rounded-lg border bg-card px-3 focus-within:ring-3 focus-within:ring-ring/50">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ou digitar frase nova (pras frases que a galera escreveu)"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
        <div className="flex flex-col gap-1">
          {freeText && <PhraseRow text={freeText} said={live.said} busy={busy} onSend={send} isNew />}
          {phrases.map((text) => (
            <PhraseRow key={text} text={text} said={live.said} busy={busy} onSend={send} />
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-2 rounded-2xl bg-card/60 p-4 ring-1 ring-border md:sticky md:top-4">
        <h2 className="font-display text-lg tracking-widest uppercase">Feed ({live.events.length})</h2>
        {[...live.events].reverse().map((e) => (
          <div key={e.id} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <span className="font-mono text-xs text-muted-foreground">#{e.id}</span>
            <span className="font-display tracking-wide uppercase">{e.text}</span>
            <span className="text-xs text-muted-foreground">
              {e.speaker === "lula" ? "Lula" : e.speaker === "flavio" ? "Flávio" : "Ambos"}
            </span>
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

function PhraseRow({
  text,
  said,
  busy,
  onSend,
  isNew,
}: {
  text: string
  said: Set<string>
  busy: string | null
  onSend: (text: string, who: Who) => void
  isNew?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5", isNew ? "bg-amarelo/10 ring-1 ring-amarelo/50" : "bg-card/60")}>
      <span className="min-w-0 flex-1 font-display tracking-wide uppercase">
        {isNew && <span className="mr-1.5 text-xs text-amarelo">NOVA</span>}
        {text}
      </span>
      {WHO.map(({ who, label, on }) => {
        const key = saidKey(text, who)
        const done = said.has(key)
        return (
          <button
            key={label}
            type="button"
            disabled={done || busy === key}
            onClick={() => onSend(text, who)}
            className={cn(
              "rounded-md border px-2.5 py-1 font-display text-xs tracking-wider uppercase transition-colors",
              done ? cn(on, "border-transparent") : "border-border bg-secondary hover:border-amarelo",
              busy === key && "animate-pulse"
            )}
          >
            {done ? "✓ " : ""}
            {label}
          </button>
        )
      })}
    </div>
  )
}
