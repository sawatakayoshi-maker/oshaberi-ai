import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import type { Item } from "@/lib/types";

/** AI秘書: 自然言語検索 → 関連情報を集めて回答生成 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { q } = (await req.json().catch(() => ({}))) as { q?: string };
  if (!q?.trim()) return NextResponse.json({ error: "q is required" }, { status: 400 });

  // 1. 全文検索（simple）→ 0件なら ilike フォールバック
  let { data } = await supabase
    .from("items")
    .select("id, kind, title, body, ai_summary, updated_at")
    .textSearch("search_tsv", q.trim(), { type: "plain", config: "simple" })
    .limit(8);

  if (!data || data.length === 0) {
    const like = `%${q.trim()}%`;
    const res = await supabase
      .from("items")
      .select("id, kind, title, body, ai_summary, updated_at")
      .or(`title.ilike.${like},body.ilike.${like}`)
      .limit(8);
    data = res.data;
  }

  const items = (data ?? []) as Item[];

  if (items.length === 0) {
    return NextResponse.json({
      answer: "関連する情報が見つかりませんでした。別のキーワードでお試しください。",
      sources: [],
    });
  }

  // 2. コンテキストを構築して回答生成
  const context = items
    .map((i) => `- [${i.kind}] ${i.title}\n  ${i.ai_summary || i.body?.slice(0, 200) || ""}`)
    .join("\n");

  let answer: string;
  try {
    answer = await getAIProvider().answer(q.trim(), context);
  } catch (e) {
    console.error("assistant answer failed:", e);
    answer = "関連情報は見つかりましたが、回答生成に失敗しました。下記をご確認ください。";
  }

  return NextResponse.json({
    answer,
    sources: items.map((i) => ({ id: i.id, kind: i.kind, title: i.title })),
  });
}
