import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Talk } from "@/components/talk";

export const dynamic = "force-dynamic";

export default async function TalkPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, email")
    .order("name", { ascending: true });

  return (
    <AppShell title="お話" description="相談相手。音声・アバター・ツール実行（確認付き）・Web検索に対応。">
      <Talk contacts={data ?? []} />
    </AppShell>
  );
}
