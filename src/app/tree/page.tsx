import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { createTreeNode } from "@/lib/actions";
import { TreeView, type TreeNode } from "@/components/tree-view";

export const dynamic = "force-dynamic";

export default async function TreePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tree_nodes")
    .select("id, parent_id, name, position")
    .order("position", { ascending: true });
  const nodes = (data ?? []) as TreeNode[];

  return (
    <AppShell title="メモリーツリー" description="知識を階層管理。ドラッグして移動できます。">
      <form action={createTreeNode} className="mb-4 flex gap-2 rounded-xl border border-line bg-surface p-3">
        <input name="name" required placeholder="ルートに項目を追加（例: 水素事業）" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">追加</button>
      </form>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <TreeView nodes={nodes} />
      </div>
    </AppShell>
  );
}
