import type { Metadata } from "next"

import { AdminPanel } from "@/components/admin-panel"

export const metadata: Metadata = { title: "Bingo do Debate · Admin", robots: { index: false } }

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-4xl tracking-tight uppercase">
        <span className="text-pt">Painel</span> <span className="text-verde">ao vivo</span>
      </h1>
      <AdminPanel />
    </main>
  )
}
