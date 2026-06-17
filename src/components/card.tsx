export function Card({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-soft">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted">
            {count}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-xs text-ink-muted">{children}</p>;
}
