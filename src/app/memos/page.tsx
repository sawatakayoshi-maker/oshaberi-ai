import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Empty, fmtDate } from "@/components/ui";
import { createItem, summarizeItem, deleteItem } from "@/lib/actions";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("items").select("*").eq("kind", "memo");
  if (q?.trim()) query = query.textSearch("search_tsv", q.trim(), { type: "plain", config: "simple" });
  const { data } = await query.order("updated_at", { ascending: false }).limit(50);
  const memos = (data ?? []) as Item[];

  return (
    <AppShell title="メモ" description="全文検索・AI要約に対応。">
      {/* 全文検索 */}
      <form className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="全文検索…"
          className="flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button className="rounded-xl border border-line px-4 text-sm hover:bg-surface-sunken">検索</button>
      </form>

      {/* 新規作成 */}
      <form action={createItem} className="mb-6 space-y-2 rounded-xl border border-line bg-surface p-3">
        <input type="hidden" name="kind" value="memo" />
        <input name="title" required placeholder="タイトル" className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
        <textarea name="body" placeholder="本文" rows={3} className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">メモを追加</button>
      </form>

      {memos.length === 0 ? (
        <Empty>メモはありません。</Empty>
      ) : (
        <ul className="space-y-2">
          {memos.map((m) => (
            <li key={m.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{m.title}</p>
                <span className="shrink-0 text-xs text-ink-muted">{fmtDate(m.updated_at)}</span>
              </div>
              {m.body && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{m.body}</p>}
              {m.ai_summary && (
                <p className="mt-2 rounded-lg bg-accent-soft p-2 text-xs text-accent">要約: {m.ai_summary}</p>
              )}
              <div className="mt-2 flex gap-2">
                <form action={summarizeItem}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface-sunken">AI要約</button>
                </form>
                <form action={deleteItem}>
                  <input type="hidden" name="id" value={m.id} />
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
