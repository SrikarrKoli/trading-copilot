import type { ButtonHTMLAttributes, ComponentProps } from "react";
import Link from "next/link";

function DirectionDetail() {
  return (
    <span aria-hidden="true" className="signal-action__detail">
      <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 20 20">
        <path d="M4 10h11M11 6l4 4-4 4" />
      </svg>
    </span>
  );
}

export function SignalActionButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`signal-action ${className}`} type={type} {...props}>
      <span>{children}</span>
      <DirectionDetail />
    </button>
  );
}

export function SignalActionLink({
  children,
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link className={`signal-action ${className}`} {...props}>
      <span>{children}</span>
      <DirectionDetail />
    </Link>
  );
}

type ControlTone = "danger" | "neutral" | "primary" | "positive";

export function ControlButton({
  children,
  className = "",
  tone = "neutral",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ControlTone }) {
  return (
    <button
      className={`control-button ${className}`}
      data-tone={tone}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
