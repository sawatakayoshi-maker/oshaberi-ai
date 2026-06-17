import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { KindBadge, Empty, fmtDate } from "@/components/ui";
import { updateItem, deleteItem } from "@/lib/actions";
import { KIND_LABEL } from "@/lib/constants";
import type { Item, ItemKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as Item[];

  return (
    <AppShell title="インボックス" description="Quick Capture で取り込んだ最新の項目。種別を修正できます。">
      {items.length === 0 ? (
        <Empty>まだ何もありません。上のバーから入力してみましょう。</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <KindBadge kind={item.kind} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.ai_summary && (
                  <p className="truncate text-xs text-ink-muted">{item.ai_summary}</p>
                )}
              </div>
              <span className="text-xs text-ink-muted">{fmtDate(item.created_at)}</span>

              {/* 種別の再振り分け */}
              <form action={updateItem} className="flex items-center gap-1">
                <input type="hidden" name="id" value={item.id} />
                <select
                  name="kind"
                  defaultValue={item.kind}
                  className="rounded-md border border-line bg-surface px-1 py-1 text-xs"
                >
                  {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <button className="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface-sunken">
                  変更
                </button>
              </form>

              <form action={deleteItem}>
                <input type="hidden" name="id" value={item.id} />
                <button className="rounded-md px-2 py-1 text-xs text-ink-muted hover:text-red-600">
                  削除
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
