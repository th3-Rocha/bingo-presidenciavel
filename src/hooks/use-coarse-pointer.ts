"use client"

import { useSyncExternalStore } from "react"

const QUERY = "(pointer: coarse)"

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

/** True on touch-first devices (phones, tablets), where we skip drag and use taps only. */
export function useCoarsePointer() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}
