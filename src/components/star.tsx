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
