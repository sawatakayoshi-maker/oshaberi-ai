import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Empty } from "@/components/ui";
import { ReportBuilder } from "@/components/report-builder";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("id, kind, title, body")
    .order("updated_at", { ascending: false })
    .limit(100);
  const items = (data ?? []) as Pick<Item, "id" | "kind" | "title" | "body">[];

  return (
    <AppShell title="レポート生成" description="選んだ項目からプロンプトを自動組み立て → AI がレポート化（送信前に編集可）。">
      {items.length === 0 ? (
        <Empty>素材になる項目がありません。メモやアイデアを追加してください。</Empty>
      ) : (
        <ReportBuilder items={items} />
      )}
    </AppShell>
  );
}
