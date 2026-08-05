import type { SVGProps } from "react";

function IconBase({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ScannerIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M4 15l6-5 4 3 6-5" /></IconBase>;
}

export function WatchlistIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M5 5h14v14H5zM8 9h5M8 13h8M8 17h5M16 5v6l-2-1-2 1V5" /></IconBase>;
}

export function MarketsIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M5 19V6M5 19h14M8 15l3-5 3 2 4-6" /></IconBase>;
}

export function PositionsIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M5 6h7v5H5zM12 13h7v5h-7zM8 11v4h4" /></IconBase>;
}

export function TradeIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M5 8h11M13 5l3 3-3 3M19 16H8M11 13l-3 3 3 3" /></IconBase>;
}

export function OrdersIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h3" /></IconBase>;
}

export function AlertsIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M7 16V9a5 5 0 0 1 10 0v7l2 2H5zM10 20h4" /></IconBase>;
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M4 7h7M15 7h5M11 4v6M4 17h5M13 17h7M9 14v6" /></IconBase>;
}

export function JournalIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M5 5h6a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 1zM19 5h-5v14h2a3 3 0 0 1 3 1zM8 9h3M8 13h3" /></IconBase>;
}

export function StrategyIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M4 18h16M6 18l4-12h4l4 12M8 13h8M10 6l2 3 2-3" /></IconBase>;
}

export function ImportIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M5 4h10l4 4v12H5zM15 4v4h4M12 17V10M9 13l3-3 3 3" /></IconBase>;
}

export function EvidenceIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M5 5h14v14H5zM8 9h5M8 13h8M8 17h6M16 7l2 2" /></IconBase>;
}

export function ReviewIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M6 4h12v16H6zM9 9l1.5 1.5L14 7M9 15h6" /></IconBase>;
}

export function ArchiveIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M5 7h14v12H5zM4 4h16v3H4zM9 11h6" /></IconBase>;
}

export function ConnectionIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M8 8l-3 3 3 3M16 8l3 3-3 3M9 11h6M12 4v3M12 15v5" /></IconBase>;
}

export function AccountIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0" /></IconBase>;
}

export function SignOutIcon(props: SVGProps<SVGSVGElement>) {
  return <IconBase {...props}><path d="M10 5H5v14h5M13 8l4 4-4 4M8 12h9" /></IconBase>;
}
