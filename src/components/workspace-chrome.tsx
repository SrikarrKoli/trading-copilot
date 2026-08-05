import type { ComponentType, SVGProps } from "react";

type WorkspaceIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface WorkspaceMetric {
  detail?: string;
  label: string;
  tone?: "accent" | "danger" | "info" | "neutral" | "warning";
  value: React.ReactNode;
}

const metricTone = {
  accent: "text-accent",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-foreground",
  warning: "text-warning",
} as const;

export function WorkspaceHeader({
  actions,
  description,
  eyebrow,
  icon: Icon,
  title,
}: {
  actions?: React.ReactNode;
  description: string;
  eyebrow: string;
  icon: WorkspaceIcon;
  title: string;
}) {
  return (
    <header className="ui-enter flex flex-col gap-6 border-b border-white/[0.09] pb-7 sm:pb-9 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
          <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          {eyebrow}
        </div>
        <h1 className="font-display max-w-4xl text-[clamp(2.35rem,4.7vw,4.1rem)] leading-[0.92] tracking-[-0.04em]">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          {description}
        </p>
      </div>
      {actions ? <div className="shrink-0 self-start lg:self-auto">{actions}</div> : null}
    </header>
  );
}

export function MetricStrip({
  metrics,
}: {
  metrics: WorkspaceMetric[];
}) {
  return (
    <section
      aria-label="Workspace summary"
      className="ui-enter ui-enter-delay-1 grid grid-cols-2 overflow-hidden rounded-lg border border-white/[0.09] bg-card xl:grid-flow-col xl:grid-cols-none xl:auto-cols-fr"
    >
      {metrics.map(({ detail, label, tone = "neutral", value }, index) => (
        <article
          key={label}
          className={`px-4 py-4 sm:px-6 ${
            index % 2 === 1 ? "border-l border-white/[0.055]" : ""
          } ${index > 1 ? "border-t border-white/[0.055] xl:border-t-0" : ""} ${
            index > 0 ? "xl:border-l" : ""
          } ${
            metrics.length % 2 === 1 && index === metrics.length - 1
              ? "col-span-2 xl:col-span-1"
              : ""
          }`}
        >
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted">
            {label}
          </p>
          <p
            className={`mt-2 font-mono text-xl font-medium tracking-[-0.035em] ${metricTone[tone]}`}
          >
            {value}
          </p>
          {detail ? (
            <p className="mt-1.5 truncate text-[9px] text-muted">{detail}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export function WorkspaceNotice({
  children,
  icon: Icon,
  tone = "neutral",
}: {
  children: React.ReactNode;
  icon: WorkspaceIcon;
  tone?: "info" | "neutral" | "warning";
}) {
  const tones = {
    info: "border-info/20 bg-info/[0.045] text-[#c4d8ec]",
    neutral: "border-white/[0.09] bg-white/[0.02] text-muted",
    warning: "border-warning/20 bg-warning/[0.045] text-[#e3c783]",
  } as const;

  return (
    <aside
      className={`ui-enter ui-enter-delay-1 flex gap-3 rounded-lg border px-4 py-3 text-[11px] leading-5 sm:px-5 ${tones[tone]}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <div>{children}</div>
    </aside>
  );
}

export function WorkspaceError({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-danger/20 bg-danger/[0.05] p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-danger">
        Workspace unavailable
      </p>
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{message}</p>
    </section>
  );
}
