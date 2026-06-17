import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { getUserModel } from "@/lib/user-settings";
import { TALK_SYSTEM } from "@/lib/ai/provider";
import type { ChatTurn } from "@/lib/types";

/** お話（会話）API: 直近履歴を受け取り応答を返す（機能A） */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    messages?: ChatTurn[];
    system?: string;
    avatarName?: string;
    web?: boolean;
  };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  // コスト抑制のため直近12ターンに制限し、role/content を正規化
  const history: ChatTurn[] = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));

  // アバター（キャラクター）名をペルソナに反映
  const avatarName = typeof body.avatarName === "string" ? body.avatarName.slice(0, 20) : "";
  const system =
    body.system ??
    (avatarName
      ? `${TALK_SYSTEM}\n\n【あなたの名前】あなたの名前は「${avatarName}」です。名前を聞かれたら「${avatarName}」と答え、ふだんも「${avatarName}」として自然にふるまってください。`
      : undefined);

  try {
    const model = await getUserModel(supabase, user.id);
    const { reply, action } = await getAIProvider().chat({
      system,
      history,
      model,
      web: !!body.web,
      actions: true, // お話はツール実行（確認後）に対応
    });
    return NextResponse.json({ reply, action });
  } catch (e) {
    console.error("talk failed:", e);
    return NextResponse.json({ error: "ai failed" }, { status: 502 });
  }
}
