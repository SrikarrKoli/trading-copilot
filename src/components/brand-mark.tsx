export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 40 40"
    >
      <rect height="39" rx="8" stroke="currentColor" strokeOpacity="0.28" width="39" x="0.5" y="0.5" />
      <path d="M8 14V8h6M26 8h6v6M32 26v6h-6M14 32H8v-6" stroke="currentColor" strokeWidth="1.5" />
      <path d="m9 24 6-5 5 3 10-8" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.75" />
      <rect fill="currentColor" height="4" width="4" x="18" y="20" />
    </svg>
  );
}
