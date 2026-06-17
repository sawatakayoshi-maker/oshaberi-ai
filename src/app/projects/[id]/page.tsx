import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { KindBadge, Empty, fmtDate } from "@/components/ui";
import { createItem } from "@/lib/actions";
import type { Item, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: itemsData }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("items").select("*").eq("project_id", id).order("updated_at", { ascending: false }),
  ]);

  if (!project) notFound();
  const p = project as Project;
  const items = (itemsData ?? []) as Item[];

  return (
    <AppShell title={p.name} description={p.description ?? "プロジェクト横断ビュー"}>
      <form action={createItem} className="mb-6 flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-3">
        <input type="hidden" name="project_id" value={p.id} />
        <select name="kind" defaultValue="task" className="rounded-lg border border-line px-2 py-2 text-sm">
          <option value="task">タスク</option>
          <option value="memo">メモ</option>
          <option value="idea">アイデア</option>
          <option value="log">ログ</option>
        </select>
        <input name="title" required placeholder="このプロジェクトに追加…" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">追加</button>
      </form>

      {items.length === 0 ? (
        <Empty>まだ項目がありません。</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <KindBadge kind={it.kind} />
              <span className="flex-1 truncate text-sm">{it.title}</span>
              <span className="text-xs text-ink-muted">{fmtDate(it.updated_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
