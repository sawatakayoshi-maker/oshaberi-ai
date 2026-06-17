import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** "明日"/"2026-07-01" 等のヒントを timestamptz に変換 */
function resolveDue(hint?: string): string | null {
  if (!hint) return null;
  const iso = Date.parse(hint);
  if (!Number.isNaN(iso)) return new Date(iso).toISOString();
  const now = new Date();
  if (hint.includes("明日")) now.setDate(now.getDate() + 1);
  else if (hint.includes("明後日")) now.setDate(now.getDate() + 2);
  else if (hint.includes("来週")) now.setDate(now.getDate() + 7);
  else if (hint.includes("今日")) {
    /* today */
  } else return null;
  now.setHours(9, 0, 0, 0);
  return now.toISOString();
}

/**
 * 機能B: お話で確認されたアクションを実行する。
 * - create_task     → items(kind=task)
 * - create_schedule → timeline_events もしくは items(kind=task, 締切付き)
 * メール（draft_email）はクライアントの mailto で開くため、ここでは扱わない。
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { tool, input } = (await req.json().catch(() => ({}))) as {
    tool?: string;
    input?: Record<string, unknown>;
  };
  const p = input ?? {};
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
  const num = (k: string) => (typeof p[k] === "number" ? (p[k] as number) : undefined);

  try {
    if (tool === "create_task") {
      const title = str("title");
      if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
      const { error } = await supabase.from("items").insert({
        user_id: user.id,
        kind: "task",
        title,
        status: "todo",
        priority: num("priority") ?? 0,
        due_at: resolveDue(str("due_hint")),
        source: "talk",
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, message: `タスク「${title}」を作成しました。` });
    }

    if (tool === "create_schedule") {
      const title = str("title");
      const date = str("date");
      if (!title || !date) return NextResponse.json({ error: "title/date required" }, { status: 400 });
      const kind = str("kind") === "task" ? "task" : "timeline";

      if (kind === "task") {
        const due = str("time") ? new Date(`${date}T${str("time")}:00`).toISOString() : `${date}T09:00:00`;
        const { error } = await supabase.from("items").insert({
          user_id: user.id,
          kind: "task",
          title,
          status: "todo",
          due_at: due,
          source: "talk",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("timeline_events").insert({
          user_id: user.id,
          title,
          description: str("description") ?? null,
          event_date: date,
        });
        if (error) throw error;
      }
      return NextResponse.json({ ok: true, message: `予定「${title}」（${date}）を登録しました。` });
    }

    return NextResponse.json({ error: "unknown tool" }, { status: 400 });
  } catch (e) {
    console.error("action failed:", e);
    return NextResponse.json({ error: "execution failed" }, { status: 500 });
  }
}
