"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatTurn } from "@/lib/types";

// ─── Web Speech API（型は最小限で宣言）───
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoicevoxCfg {
  enabled: boolean;
  url: string;
  speaker: number;
}
const VV_KEY = "pb:voicevox";
const TTS_KEY = "pb:tts";

export function Talk() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tts, setTts] = useState(false);
  const [listening, setListening] = useState(false);
  const [showVv, setShowVv] = useState(false);
  const [vv, setVv] = useState<VoicevoxCfg>({ enabled: false, url: "http://127.0.0.1:50021", speaker: 0 });
  const recRef = useRef<RecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // 設定の復元
  useEffect(() => {
    try {
      const v = localStorage.getItem(VV_KEY);
      if (v) setVv(JSON.parse(v));
      setTts(localStorage.getItem(TTS_KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(VV_KEY, JSON.stringify(vv));
    } catch {
      /* noop */
    }
  }, [vv]);
  useEffect(() => {
    try {
      localStorage.setItem(TTS_KEY, tts ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [tts]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // ── 読み上げ ──
  function browserSpeak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    window.speechSynthesis.speak(u);
  }
  async function voicevoxSpeak(text: string) {
    const base = vv.url.replace(/\/+$/, "");
    const q = await fetch(`${base}/audio_query?speaker=${vv.speaker}&text=${encodeURIComponent(text)}`, {
      method: "POST",
    });
    if (!q.ok) throw new Error("audio_query");
    const query = await q.json();
    const s = await fetch(`${base}/synthesis?speaker=${vv.speaker}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    if (!s.ok) throw new Error("synthesis");
    const url = URL.createObjectURL(await s.blob());
    audioRef.current?.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => URL.revokeObjectURL(url);
    await a.play();
  }
  function speak(text: string) {
    if (!tts || !text) return;
    // VOICEVOX が使えない環境（通信遮断など）は静かに端末の声へフォールバック
    if (vv.enabled) voicevoxSpeak(text).catch(() => browserSpeak(text));
    else browserSpeak(text);
  }

  // ── 送信 ──
  async function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    const next: ChatTurn[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        speak(data.reply);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "うまく応答できなかったみたい。もう一度試してね。" }]);
      }
    } finally {
      setBusy(false);
    }
  }

  // ── 音声入力 ──
  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      alert("このブラウザは音声入力に対応していません。");
      return;
    }
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      if (s.trim()) send(s);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTts(!tts)}
          className={`rounded-full border px-3 py-1.5 text-sm ${tts ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
        >
          {tts ? "🔊 声オン" : "🔈 声オフ"}
        </button>
        <button onClick={() => setShowVv(!showVv)} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft">
          ⚙️ 声設定
        </button>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="ml-auto rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted">
            会話をクリア
          </button>
        )}
      </div>

      {showVv && (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={vv.enabled} onChange={(e) => setVv({ ...vv, enabled: e.target.checked })} />
            VOICEVOX で話す（使えないときは自動で端末の声）
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              value={vv.url}
              onChange={(e) => setVv({ ...vv, url: e.target.value })}
              placeholder="http://127.0.0.1:50021"
              className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5"
            />
            <input
              type="number"
              value={vv.speaker}
              onChange={(e) => setVv({ ...vv, speaker: Number(e.target.value) })}
              placeholder="話者ID"
              className="w-24 rounded-lg border border-line px-2 py-1.5"
            />
          </div>
          <p className="text-xs text-ink-muted">
            VOICEVOX エンジンをローカル起動している場合のみ高品質な声で話します。未起動時は端末の声になります（VOICEVOX 使用時はクレジット表示が必要）。
          </p>
        </div>
      )}

      {/* 会話 */}
      <div className="min-h-[320px] rounded-2xl border border-line bg-surface p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl">🙂</div>
            <p className="text-sm text-ink-muted">気軽に話しかけてみてください。聞き役になります。</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => (
              <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-accent text-white" : "bg-surface-sunken text-ink"
                  }`}
                >
                  {m.content}
                </div>
              </li>
            ))}
            {busy && <li className="text-sm text-ink-muted">…考え中</li>}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      {/* 入力 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleMic}
          className={`rounded-full border px-3 py-2.5 ${listening ? "border-red-500 bg-red-500 text-white" : "border-line text-ink-soft"}`}
          title="音声入力"
        >
          {listening ? "● 録音中" : "🎙"}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力…"
          className="flex-1 rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button disabled={busy} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          送信
        </button>
      </form>
    </div>
  );
}
