import Link from "next/link";

const NAV: { href: string; label: string; icon: string }[] = [
  { href: "/", label: "ダッシュボード", icon: "◎" },
  { href: "/inbox", label: "インボックス", icon: "↘" },
  { href: "/memos", label: "メモ", icon: "✎" },
  { href: "/tasks", label: "タスク", icon: "☑" },
  { href: "/ideas", label: "アイデア", icon: "✦" },
  { href: "/projects", label: "プロジェクト", icon: "▤" },
  { href: "/tree", label: "メモリーツリー", icon: "⌥" },
  { href: "/graph", label: "グラフ", icon: "⌗" },
  { href: "/timeline", label: "タイムライン", icon: "↗" },
  { href: "/assistant", label: "AI秘書", icon: "✺" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface p-3 md:flex">
      <div className="px-2 py-3">
        <p className="text-sm font-semibold">Personal Brain OS</p>
        <p className="text-xs text-ink-muted">第二の脳</p>
      </div>
      <nav className="mt-2 flex flex-col gap-0.5">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-surface-sunken"
          >
            <span className="w-4 text-center text-ink-muted">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto px-3 py-2">
        <Link href="/settings" className="text-xs text-ink-muted hover:text-ink-soft">
          設定
        </Link>
      </div>
    </aside>
  );
}
