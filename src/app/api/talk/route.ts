import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { getUserModel } from "@/lib/user-settings";
import { TALK_SYSTEM } from "@/lib/ai/provider";
import { LANG_NATIVE, type LangCode } from "@/lib/talk-i18n";
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
    note?: string;
    lang?: string;
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
  // 「ずっと覚えておくメモ」：本人が登録した、毎回必ず伝える情報（長文の会社情報なども全文渡す）
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 50000) : "";

  let system = body.system ?? TALK_SYSTEM;
  if (!body.system && avatarName) {
    system += `\n\n【あなたの名前】あなたの名前は「${avatarName}」です。名前を聞かれたら「${avatarName}」と答え、ふだんも「${avatarName}」として自然にふるまってください。`;
  }
  if (note) {
    system += `\n\n【ずっと覚えておくこと（本人が登録した大切な情報。常に踏まえて話すこと）】\n${note}`;
  }
  // 表示・会話の言語（ja/en/ko/th/vi）。指定があればその言語で返答する。
  const lang = (body.lang ?? "") as LangCode;
  if (LANG_NATIVE[lang]) {
    system += `\n\n【返答する言語】このユーザーには ${LANG_NATIVE[lang]} で返答してください。ユーザーが別の言語で話した場合はその言語に合わせてください。`;
  }

  const model = await getUserModel(supabase, user.id);
  const provider = getAIProvider();

  // ③ ストリーミング対応プロバイダ（Claude）は NDJSON で逐次返す
  if (provider.chatStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        try {
          const result = await provider.chatStream!(
            { system, history, model, web: !!body.web, actions: true },
            (chunk) => send({ type: "delta", text: chunk })
          );
          send({ type: "done", action: result.action });
        } catch (inner) {
          // ツール／Web検索が原因の失敗時は素の会話で1回だけ再試行
          console.error("talk stream failed. retry plain:", inner);
          try {
            const { reply } = await provider.chat({ system, history, model, web: false, actions: false });
            send({ type: "delta", text: reply });
            send({ type: "done" });
          } catch (e2) {
            console.error("talk plain retry failed:", e2);
            send({ type: "error" });
          }
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  // 非ストリーミング（OpenAI 等）フォールバック
  try {
    try {
      const { reply, action } = await provider.chat({
        system,
        history,
        model,
        web: !!body.web,
        actions: true,
      });
      return NextResponse.json({ reply, action });
    } catch (inner) {
      console.error("talk failed (tools/web). retry plain:", inner);
      const { reply } = await provider.chat({ system, history, model, web: false, actions: false });
      return NextResponse.json({ reply, action: undefined, degraded: true });
    }
  } catch (e) {
    console.error("talk failed:", e);
    return NextResponse.json({ error: "ai failed" }, { status: 502 });
  }
}
