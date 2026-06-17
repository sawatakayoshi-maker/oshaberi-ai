import { NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * 通知生成バッチ。
 * - 期限切れタスク / 30日以上未更新のアイデア を検出し notifications を生成。
 * Vercel Cron から呼び出す想定。CRON_SECRET があれば Authorization: Bearer で検証し、
 * SERVICE_ROLE で全ユーザを対象に処理する。手動（ログイン中）呼び出しにも対応。
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed = secret && req.headers.get("authorization") === `Bearer ${secret}`;

  // サービスロール（全ユーザ対象） or ログインユーザのみ
  const supabase = authed
    ? createSbClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    : await createUserClient();

  if (!authed) {
    const { data } = await (supabase as Awaited<ReturnType<typeof createUserClient>>).auth.getUser();
    if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();
  let created = 0;

  // 1. 期限切れの未完了タスク
  const { data: overdue } = await supabase
    .from("items")
    .select("id, user_id, title")
    .eq("kind", "task")
    .neq("status", "done")
    .lt("due_at", now.toISOString())
    .limit(500);

  for (const t of overdue ?? []) {
    created += await upsertNotification(supabase, t.user_id, "overdue", t.id, "期限切れのタスク", t.title);
  }

  // 2. 30日以上更新のないアイデア
  const { data: staleIdeas } = await supabase
    .from("items")
    .select("id, user_id, title")
    .eq("kind", "idea")
    .lt("updated_at", thirtyDaysAgo)
    .limit(500);

  for (const i of staleIdeas ?? []) {
    created += await upsertNotification(
      supabase,
      i.user_id,
      "stale_idea",
      i.id,
      "放置されているアイデア",
      `「${i.title}」は30日以上更新されていません。`
    );
  }

  return NextResponse.json({ ok: true, created });
}

/** 同一 (type,item) の未読通知が無い場合のみ作成 */
async function upsertNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  type: string,
  itemId: string,
  title: string,
  body: string
): Promise<number> {
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("item_id", itemId)
    .eq("type", type)
    .is("read_at", null)
    .limit(1);
  if (existing && existing.length > 0) return 0;

  const { error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, type, item_id: itemId, title, body });
  return error ? 0 : 1;
}
