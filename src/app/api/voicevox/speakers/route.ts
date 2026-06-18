import { NextResponse } from "next/server";

/**
 * VOICEVOX 話者一覧の中継。
 * ブラウザから直接 VOICEVOX(127.0.0.1:50021) を呼ぶと CORS で弾かれることがあるため、
 * 同一マシン上のアプリサーバー経由で取得して返す。
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url") || "http://127.0.0.1:50021";
  // 入力に /docs などの余分なパスが含まれていても、ホスト:ポートだけを使う
  let base: string;
  try {
    base = new URL(raw).origin;
  } catch {
    base = "http://127.0.0.1:50021";
  }
  try {
    const res = await fetch(`${base}/speakers`, { cache: "no-store" });
    if (!res.ok) throw new Error("speakers");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "VOICEVOX に接続できませんでした（起動中か URL をご確認ください）。" },
      { status: 502 }
    );
  }
}
