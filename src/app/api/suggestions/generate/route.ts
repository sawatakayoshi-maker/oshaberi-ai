import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 知識進化（簡易版）: 30日以上更新のない重要アイデア/メモを「掘り起こし」候補として
 * ai_suggestions に登録する。将来は AI による類似度解析・関連提案に拡張する。
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: stale } = await supabase
    .from("items")
    .select("id, title, kind")
    .in("kind", ["idea", "memo"])
    .lt("updated_at", thirtyDaysAgo)
    .limit(20);

  let created = 0;
  for (const it of stale ?? []) {
    const { data: existing } = await supabase
      .from("ai_suggestions")
      .select("id")
      .eq("item_id", it.id)
      .eq("type", "revive")
      .eq("status", "open")
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { error } = await supabase.from("ai_suggestions").insert({
      user_id: user.id,
      type: "revive",
      item_id: it.id,
      payload: { reason: "30日以上更新されていません", title: it.title },
    });
    if (!error) created++;
  }

  return NextResponse.json({ ok: true, created });
}
