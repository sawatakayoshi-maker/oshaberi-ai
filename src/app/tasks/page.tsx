import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Empty, PriorityTag, fmtDate } from "@/components/ui";
import { createItem, toggleTask, deleteItem } from "@/lib/actions";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("kind", "task")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(100);
  const tasks = (data ?? []) as Item[];

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const now = Date.now();

  return (
    <AppShell title="タスク" description="今日やること・期限・優先度を管理。">
      <form action={createItem} className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
        <input type="hidden" name="kind" value="task" />
        <input name="title" required placeholder="タスクを追加…" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <input type="date" name="due_at" className="rounded-lg border border-line px-2 py-2 text-sm" />
        <select name="priority" defaultValue="0" className="rounded-lg border border-line px-2 py-2 text-sm">
          <option value="0">優先度なし</option>
          <option value="1">低</option>
          <option value="2">中</option>
          <option value="3">高</option>
        </select>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">追加</button>
      </form>

      <h2 className="mb-2 text-sm font-semibold text-ink-soft">未完了（{open.length}）</h2>
      {open.length === 0 ? (
        <Empty>未完了のタスクはありません。</Empty>
      ) : (
        <ul className="space-y-1">
          {open.map((t) => {
            const overdue = t.due_at && new Date(t.due_at).getTime() < now;
            return (
              <li key={t.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                <form action={toggleTask}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="done" value="false" />
                  <button className="text-ink-muted hover:text-accent" title="完了にする">○</button>
                </form>
                <span className="flex-1 truncate text-sm">{t.title}</span>
                <PriorityTag priority={t.priority} />
                {t.due_at && (
                  <span className={`text-xs ${overdue ? "text-red-600" : "text-ink-muted"}`}>{fmtDate(t.due_at)}</span>
                )}
                <form action={deleteItem}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="text-xs text-ink-muted hover:text-red-600">削除</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-ink-soft">完了（{done.length}）</h2>
          <ul className="space-y-1">
            {done.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-xl px-3 py-2">
                <form action={toggleTask}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="done" value="true" />
                  <button className="text-accent" title="未完了に戻す">●</button>
                </form>
                <span className="flex-1 truncate text-sm text-ink-muted line-through">{t.title}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
