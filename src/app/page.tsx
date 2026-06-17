import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { QuickCapture } from "@/components/quick-capture";
import { Card, EmptyHint } from "@/components/card";
import type { Item, Notification, IdeaScores } from "@/lib/types";

export const dynamic = "force-dynamic";

function ideaTotal(s: IdeaScores | null): number {
  if (!s) return 0;
  return s.market + s.feasibility + s.profitability + s.future;
}

export default async function Dashboard() {
  const supabase = await createClient();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 並列で取得（RLS により自動でユーザ単位に絞られる）
  const [tasksRes, memosRes, ideasRes, notifsRes] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("kind", "task")
      .neq("status", "done")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("items")
      .select("*")
      .eq("kind", "memo")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase.from("items").select("*").eq("kind", "idea").limit(20),
    supabase
      .from("notifications")
      .select("*")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const tasks = (tasksRes.data ?? []) as Item[];
  const memos = (memosRes.data ?? []) as Item[];
  const ideas = ((ideasRes.data ?? []) as Item[])
    .sort((a, b) => ideaTotal(b.scores) - ideaTotal(a.scores))
    .slice(0, 5);
  const notifs = (notifsRes.data ?? []) as Notification[];

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          <header className="mb-4">
            <p className="text-xs text-ink-muted">{today}</p>
            <h1 className="text-2xl font-semibold">おかえりなさい</h1>
          </header>

          <div className="mb-6">
            <QuickCapture />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="今日のタスク" count={tasks.length}>
              {tasks.length === 0 ? (
                <EmptyHint>未完了のタスクはありません</EmptyHint>
              ) : (
                <ul className="space-y-1">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-sunken"
                    >
                      <span className="text-ink-muted">○</span>
                      <span className="flex-1 truncate">{t.title}</span>
                      {t.due_at && (
                        <span className="text-xs text-ink-muted">
                          {new Date(t.due_at).toLocaleDateString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {t.priority >= 2 && (
                        <span className="rounded bg-accent-soft px-1.5 text-xs text-accent">
                          {t.priority === 3 ? "高" : "中"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="最近のメモ" count={memos.length}>
              {memos.length === 0 ? (
                <EmptyHint>メモはまだありません</EmptyHint>
              ) : (
                <ul className="space-y-1">
                  {memos.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-lg px-2 py-1.5 text-sm hover:bg-surface-sunken"
                    >
                      <p className="truncate font-medium">{m.title}</p>
                      {m.ai_summary && (
                        <p className="truncate text-xs text-ink-muted">{m.ai_summary}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="注目アイデア" count={ideas.length}>
              {ideas.length === 0 ? (
                <EmptyHint>アイデアを Quick Capture から追加しましょう</EmptyHint>
              ) : (
                <ul className="space-y-1">
                  {ideas.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-sunken"
                    >
                      <span className="text-accent">✦</span>
                      <span className="flex-1 truncate">{i.title}</span>
                      {i.scores && (
                        <span className="text-xs text-ink-muted">
                          {Math.round(ideaTotal(i.scores) / 4)}点
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="通知 / AI提案" count={notifs.length}>
              {notifs.length === 0 ? (
                <EmptyHint>新しい通知はありません</EmptyHint>
              ) : (
                <ul className="space-y-1">
                  {notifs.map((n) => (
                    <li key={n.id} className="rounded-lg px-2 py-1.5 text-sm hover:bg-surface-sunken">
                      <p className="font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-ink-muted">{n.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
