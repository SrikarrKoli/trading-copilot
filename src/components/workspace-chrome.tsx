import type { LucideIcon } from "lucide-react";

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
  icon: LucideIcon;
  title: string;
}) {
  return (
    <header className="ui-enter flex flex-col gap-6 border-b border-white/[0.075] pb-7 sm:pb-9 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.17em] text-accent">
          <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          {eyebrow}
        </div>
        <h1 className="max-w-4xl text-[clamp(2rem,4vw,3.5rem)] font-medium leading-none tracking-[-0.055em]">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#9da7a1]">
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
      className="ui-enter ui-enter-delay-1 grid grid-cols-2 overflow-hidden rounded-[22px] border border-white/[0.07] bg-card/75 xl:grid-flow-col xl:grid-cols-none xl:auto-cols-fr"
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
  icon: LucideIcon;
  tone?: "info" | "neutral" | "warning";
}) {
  const tones = {
    info: "border-info/15 bg-info/[0.045] text-[#bec8ef]",
    neutral: "border-white/[0.07] bg-white/[0.025] text-[#a4ada8]",
    warning: "border-warning/15 bg-warning/[0.045] text-[#dfcea6]",
  } as const;

  return (
    <aside
      className={`ui-enter ui-enter-delay-1 flex gap-3 rounded-[18px] border px-4 py-3 text-[11px] leading-5 sm:px-5 ${tones[tone]}`}
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
    <section className="rounded-[24px] border border-danger/20 bg-danger/[0.05] p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-danger">
        Workspace unavailable
      </p>
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{message}</p>
    </section>
  );
}
