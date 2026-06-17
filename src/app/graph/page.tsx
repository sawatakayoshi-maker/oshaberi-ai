import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Empty } from "@/components/ui";
import { createLink } from "@/lib/actions";
import { GraphView, type GraphNode, type GraphEdge } from "@/components/graph-view";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const supabase = await createClient();
  const [{ data: items }, { data: links }] = await Promise.all([
    supabase.from("items").select("id, title, kind").limit(300),
    supabase.from("links").select("id, source_item_id, target_item_id, relation").limit(1000),
  ]);

  const nodes = ((items ?? []) as Pick<Item, "id" | "title" | "kind">[]).map(
    (i): GraphNode => ({ id: i.id, title: i.title, kind: i.kind })
  );
  const edges = ((links ?? []) as GraphEdge[]) ?? [];
  const itemOptions = (items ?? []) as { id: string; title: string }[];

  return (
    <AppShell title="ナレッジグラフ" description="知識同士の関連をネットワークで可視化。">
      <form action={createLink} className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
        <select name="source_item_id" required className="min-w-0 flex-1 rounded-lg border border-line px-2 py-2 text-sm">
          <option value="">起点を選択</option>
          {itemOptions.map((i) => (
            <option key={i.id} value={i.id}>{i.title}</option>
          ))}
        </select>
        <span className="text-ink-muted">→</span>
        <select name="target_item_id" required className="min-w-0 flex-1 rounded-lg border border-line px-2 py-2 text-sm">
          <option value="">関連先を選択</option>
          {itemOptions.map((i) => (
            <option key={i.id} value={i.id}>{i.title}</option>
          ))}
        </select>
        <input name="relation" placeholder="関係（任意）" className="w-32 rounded-lg border border-line px-2 py-2 text-sm" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">関連付け</button>
      </form>

      {nodes.length === 0 ? (
        <Empty>項目がありません。メモやアイデアを追加してから関連付けましょう。</Empty>
      ) : (
        <div className="rounded-2xl border border-line bg-surface">
          <GraphView nodes={nodes} edges={edges} />
        </div>
      )}
    </AppShell>
  );
}
