import { BingoApp } from "@/components/bingo-app"
import { Star } from "@/components/star"

export default function Home() {
  return (
    <>
      <div className="xadrez-faixa h-2" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:py-12">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-muted-foreground uppercase">
            <Star className="size-3.5 text-pt" /> Debate Globo · 23/10 · 21h20 <span>🇧🇷</span>
          </p>
          <h1 className="font-display text-6xl leading-none tracking-tight uppercase sm:text-8xl">
            <span className="text-pt">Bingo</span> <span className="text-papel">do</span>{" "}
            <span className="text-verde">Debate</span>
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground">
            <strong className="text-papel">Lula × Flávio.</strong> Monte a cartela com 19 frases da lista + 5 suas e
            aposte quem vai falar cada uma. Às 21h20 as cartelas travam e é só marcar.
          </p>
        </header>
        <BingoApp />
      </main>
      <footer className="pb-6 text-center text-xs text-muted-foreground">
        Sátira, sem lado. Sua cartela fica só no seu navegador.
      </footer>
      <div className="xadrez-faixa h-2" />
    </>
  )
}
