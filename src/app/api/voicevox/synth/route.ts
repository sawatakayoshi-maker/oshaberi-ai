import { NextResponse } from "next/server";

/**
 * VOICEVOX 音声合成の中継。
 * audio_query → synthesis をサーバー側で行い、WAV を返す（ブラウザの CORS を回避）。
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    url?: string;
    speaker?: number;
    text?: string;
    speedScale?: number;
  };
  const raw = body.url || "http://127.0.0.1:50021";
  let base: string;
  try {
    base = new URL(raw).origin;
  } catch {
    base = "http://127.0.0.1:50021";
  }
  const speaker = typeof body.speaker === "number" ? body.speaker : 3;
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  try {
    const q = await fetch(`${base}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`, {
      method: "POST",
    });
    if (!q.ok) throw new Error("audio_query");
    const query = await q.json();
    if (typeof body.speedScale === "number") query.speedScale = body.speedScale;
    const s = await fetch(`${base}/synthesis?speaker=${speaker}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    if (!s.ok) throw new Error("synthesis");
    const buf = await s.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "VOICEVOX 合成に失敗しました（起動中か URL をご確認ください）。" },
      { status: 502 }
    );
  }
}
