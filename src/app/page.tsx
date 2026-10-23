import { BingoApp } from "@/components/bingo-app"

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Debate Globo · 23/10 · 21h20
        </p>
        <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">Bingo do Debate</h1>
        <p className="mt-2 text-muted-foreground">
          Lula × Flávio Bolsonaro. Escolha 24 frases que você acha que eles vão soltar, trave antes do
          debate e manda pra galera. Quem acertar mais, ganha.
        </p>
      </header>
      <BingoApp />
      <footer className="mt-auto pt-6 text-center text-xs text-muted-foreground">
        Sátira, sem lado. Sua cartela fica salva só no seu navegador.
      </footer>
    </main>
  )
}
