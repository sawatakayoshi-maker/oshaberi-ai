import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Empty } from "@/components/ui";
import { createItem, scoreIdea, deleteItem } from "@/lib/actions";
import { SCORE_AXES } from "@/lib/constants";
import type { Item, IdeaScores } from "@/lib/types";

export const dynamic = "force-dynamic";

function total(s: IdeaScores | null) {
  return s ? Math.round((s.market + s.feasibility + s.profitability + s.future) / 4) : 0;
}

export default async function IdeasPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("items").select("*").eq("kind", "idea").limit(100);
  const ideas = ((data ?? []) as Item[]).sort((a, b) => total(b.scores) - total(a.scores));

  return (
    <AppShell title="アイデア" description="市場性・実現性・収益性・将来性を AI がスコアリング。">
      <form action={createItem} className="mb-6 space-y-2 rounded-xl border border-line bg-surface p-3">
        <input type="hidden" name="kind" value="idea" />
        <input name="title" required placeholder="アイデア名" className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
        <textarea name="body" placeholder="説明・関連資料" rows={2} className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">アイデアを追加</button>
      </form>

      {ideas.length === 0 ? (
        <Empty>アイデアはありません。</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {ideas.map((idea) => (
            <li key={idea.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{idea.title}</p>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-sm font-semibold text-accent">
                  {total(idea.scores)}
                </span>
              </div>
              {idea.body && <p className="mt-1 text-sm text-ink-soft">{idea.body}</p>}

              <div className="mt-3 space-y-1.5">
                {SCORE_AXES.map((axis) => {
                  const v = idea.scores ? idea.scores[axis.key] : 0;
                  return (
                    <div key={axis.key} className="flex items-center gap-2">
                      <span className="w-12 text-xs text-ink-muted">{axis.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
                      </div>
                      <span className="w-7 text-right text-xs text-ink-muted">{v}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-2">
                <form action={scoreIdea}>
                  <input type="hidden" name="id" value={idea.id} />
                  <button className="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface-sunken">
                    {idea.scores ? "再スコアリング" : "AIスコアリング"}
                  </button>
                </form>
                <form action={deleteItem}>
                  <input type="hidden" name="id" value={idea.id} />
                  <button className="rounded-md px-2 py-1 text-xs text-ink-muted hover:text-red-600">削除</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
