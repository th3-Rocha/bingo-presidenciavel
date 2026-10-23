import { BingoApp } from "@/components/bingo-app"
import { Flag, Star } from "@/components/star"

const STEPS = [
  { n: "1", title: "Monte", text: "24 frases. Vermelho é aposta que o Lula fala, verde que o Flávio fala." },
  { n: "2", title: "Mande", text: "Compartilhe a cartela com a galera antes das 21h20, quando tudo trava." },
  { n: "3", title: "Marque", text: "Durante o debate o que sair marca sozinho. Fechou linha, BINGO." },
]

export default function Home() {
  return (
    <>
      <div className="xadrez-faixa h-2" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-6 sm:pt-10">
        <header className="flex flex-col items-center gap-4 text-center sm:gap-5">
          <p className="flex items-center gap-2 rounded-full bg-pt/15 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-papel uppercase ring-1 ring-pt/40">
            <span className="size-2 animate-pulse rounded-full bg-pt" /> Hoje · 21h20 · TV Globo
          </p>

          <h1 className="font-display text-[clamp(3.5rem,16vw,8rem)] leading-[0.85] tracking-tight uppercase">
            <span className="text-papel">Bingo</span>
            <br />
            <span className="bg-linear-to-r from-pt via-amarelo to-verde bg-clip-text text-transparent">
              do Debate
            </span>
          </h1>

          {/* Fight-poster versus banner */}
          <div className="grid w-full max-w-xl grid-cols-[1fr_auto_1fr] items-stretch overflow-hidden rounded-2xl ring-1 ring-papel/10">
            <div className="relative flex items-center justify-center overflow-hidden bg-pt py-4">
              <Star className="absolute -left-3 -bottom-6 size-24 text-papel/15" />
              <span className="relative font-display text-3xl tracking-wide uppercase sm:text-4xl">Lula</span>
            </div>
            <div className="flex items-center bg-amarelo px-3 font-display text-3xl text-noite sm:px-4 sm:text-4xl">
              ×
            </div>
            <div className="relative flex items-center justify-center overflow-hidden bg-verde py-4">
              <Flag className="absolute -right-4 -bottom-5 w-28 -rotate-12 text-papel/15" />
              <span className="relative font-display text-3xl tracking-wide uppercase sm:text-4xl">Flávio</span>
            </div>
          </div>

          <ol className="grid w-full max-w-3xl gap-2 text-left sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-center gap-3 rounded-2xl bg-card/60 px-3 py-2 ring-1 ring-border sm:items-start sm:py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amarelo font-display text-lg text-noite">
                  {s.n}
                </span>
                <span className="flex flex-col">
                  <strong className="font-display text-lg leading-tight tracking-wide uppercase">{s.title}</strong>
                  <span className="text-xs leading-snug text-muted-foreground sm:text-sm">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </header>

        <BingoApp />
      </main>
      <footer className="pb-28 text-center text-xs text-muted-foreground">
        Sátira, sem lado. Sua cartela fica só no seu navegador.
      </footer>
    </>
  )
}
