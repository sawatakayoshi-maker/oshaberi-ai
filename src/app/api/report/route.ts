import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { getUserModel } from "@/lib/user-settings";

/** レポート生成 API: 組み立て済みプロンプトから Markdown を生成（機能C） */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { prompt } = (await req.json().catch(() => ({}))) as { prompt?: string };
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const model = await getUserModel(supabase, user.id);
    // レポートは長くなりがちなので max_tokens を大きめに
    const report = await getAIProvider().report({ prompt: prompt.trim(), model, maxTokens: 4096 });
    return NextResponse.json({ report });
  } catch (e) {
    console.error("report failed:", e);
    return NextResponse.json({ error: "ai failed" }, { status: 502 });
  }
}
