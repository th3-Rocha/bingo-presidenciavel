export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 1.5l3.1 6.9 7.4.7-5.6 5 1.7 7.4L12 17.7l-6.6 3.8 1.7-7.4-5.6-5 7.4-.7z"
      />
    </svg>
  )
}

/** Brazil flag silhouette (diamond, globe and band) drawn in one color, like the star. */
export function Flag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" aria-hidden className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M14 1.5 26.5 10 14 18.5 1.5 10zM14 5.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6z"
      />
      <path d="M9.4 8.6c3-.9 6.6-.6 9.2 1" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}
