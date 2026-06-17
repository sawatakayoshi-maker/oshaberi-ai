import type { ItemKind } from "@/lib/types";
import { KIND_ICON, KIND_LABEL, PRIORITY_LABEL } from "@/lib/constants";

export function KindBadge({ kind }: { kind: ItemKind }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-sunken px-1.5 py-0.5 text-xs text-ink-muted">
      <span>{KIND_ICON[kind]}</span>
      {KIND_LABEL[kind]}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: number }) {
  if (!priority) return null;
  return (
    <span className="rounded bg-accent-soft px-1.5 text-xs text-accent">
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-ink-muted">
      {children}
    </div>
  );
}

export function fmtDate(d: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ja-JP", opts ?? { month: "numeric", day: "numeric" });
}
