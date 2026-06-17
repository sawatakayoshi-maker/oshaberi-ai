import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { normalizeClassification } from "@/lib/ai/provider";
import type { CaptureClassification } from "@/lib/types";

/** "明日"/"2026-07-01" 等のヒントを timestamptz に粗く変換（MVP） */
function resolveDue(hint: string | null): string | null {
  if (!hint) return null;
  const iso = Date.parse(hint);
  if (!Number.isNaN(iso)) return new Date(iso).toISOString();
  const now = new Date();
  if (hint.includes("明日")) now.setDate(now.getDate() + 1);
  else if (hint.includes("来週")) now.setDate(now.getDate() + 7);
  else if (hint.includes("今日")) {
    /* today */
  } else return null;
  now.setHours(9, 0, 0, 0);
  return now.toISOString();
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // 1. AI 分類（失敗時は memo にフォールバックして取りこぼしを防ぐ）
  let cls: CaptureClassification;
  try {
    cls = await getAIProvider().classifyCapture(text.trim());
  } catch (e) {
    console.error("classify failed:", e);
    cls = normalizeClassification({ title: text.trim().slice(0, 60), kind: "memo" });
  }

  // 2. item を作成
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      kind: cls.kind,
      title: cls.title,
      body: text.trim(),
      source: "quick_capture",
      priority: cls.priority,
      status: cls.kind === "task" ? "todo" : null,
      due_at: cls.kind === "task" ? resolveDue(cls.due_hint) : null,
      ai_summary: cls.summary,
    })
    .select()
    .single();

  if (error || !item) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  // 3. タグを upsert して関連付け
  if (cls.tags.length) {
    const { data: tags } = await supabase
      .from("tags")
      .upsert(
        cls.tags.map((name) => ({ user_id: user.id, name })),
        { onConflict: "user_id,name", ignoreDuplicates: false }
      )
      .select();
    if (tags?.length) {
      await supabase
        .from("item_tags")
        .insert(tags.map((t) => ({ item_id: item.id, tag_id: t.id })));
    }
  }

  return NextResponse.json({ item, classification: cls });
}
