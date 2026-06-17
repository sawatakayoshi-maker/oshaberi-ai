"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatTurn } from "@/lib/types";
import { AvatarView } from "@/components/avatar";
import { AVATARS, findAvatar, type AvatarState } from "@/lib/avatars";

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
const SLOW_KEY = "pb:slow";
const AV_KEY = "pb:avatar";
const MSG_KEY = "pb:talk:history";
const FONT_SIZES = ["text-sm", "text-base", "text-lg"];
const FONT_LABELS = ["文字:標準", "文字:大", "文字:特大"];

export function Talk() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tts, setTts] = useState(true); // 読み上げ既定オン
  const [slow, setSlow] = useState(false); // ゆっくり
  const [listening, setListening] = useState(false);
  const [standby, setStandby] = useState(false); // 待受（連続音声）
  const [showVv, setShowVv] = useState(false);
  const [vv, setVv] = useState<VoicevoxCfg>({ enabled: true, url: "http://127.0.0.1:50021", speaker: 3 });
  const [avatarId, setAvatarId] = useState<string>("ai_f");
  const [fontIdx, setFontIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false); // 発話中（口パク用）

  const recRef = useRef<RecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const standbyRef = useRef(false);
  const busyRef = useRef(false);
  const restored = useRef(false);
  const pulseRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const avatar = findAvatar(avatarId);
  // 状態に応じた表情：応答待ち=考え中、発話中=speaking、それ以外=待機
  const avatarState: AvatarState = busy ? "thinking" : speaking ? "speaking" : "idle";

  // 設定・記憶の復元
  useEffect(() => {
    try {
      const v = localStorage.getItem(VV_KEY);
      if (v) setVv(JSON.parse(v));
      const savedTts = localStorage.getItem(TTS_KEY);
      if (savedTts !== null) setTts(savedTts === "1");
      setSlow(localStorage.getItem(SLOW_KEY) === "1");
      const av = localStorage.getItem(AV_KEY);
      if (av) setAvatarId(av);
      const hist = localStorage.getItem(MSG_KEY);
      if (hist) setMessages(JSON.parse(hist));
    } catch {
      /* noop */
    }
    restored.current = true;
  }, []);

  // 設定の保存
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
    try {
      localStorage.setItem(SLOW_KEY, slow ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [slow]);
  useEffect(() => {
    try {
      localStorage.setItem(AV_KEY, avatarId);
    } catch {
      /* noop */
    }
  }, [avatarId]);

  // 記憶（会話履歴）の保存。直近40件まで。
  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(MSG_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* noop */
    }
  }, [messages]);

  useEffect(() => {
    standbyRef.current = standby;
  }, [standby]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // ── 読み上げ ──
  function speechRate() {
    return slow ? 0.85 : 1;
  }
  function browserSpeak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      pulseSpeaking(text);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = speechRate();
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }
  async function voicevoxSpeak(text: string) {
    const base = vv.url.replace(/\/+$/, "");
    const q = await fetch(`${base}/audio_query?speaker=${vv.speaker}&text=${encodeURIComponent(text)}`, {
      method: "POST",
    });
    if (!q.ok) throw new Error("audio_query");
    const query = await q.json();
    query.speedScale = speechRate(); // 「ゆっくり」を VOICEVOX 話速にも反映
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
    a.onplay = () => setSpeaking(true);
    const stop = () => {
      setSpeaking(false);
      URL.revokeObjectURL(url);
    };
    a.onended = stop;
    a.onerror = stop;
    await a.play();
  }
  // 声オフ環境でも口パクだけは動かす（文字数からおおよその発話時間を推定）
  function pulseSpeaking(text: string) {
    setSpeaking(true);
    clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setSpeaking(false), Math.min(8000, 1000 + text.length * 60));
  }
  function speak(text: string) {
    if (!text) return;
    if (!tts) {
      pulseSpeaking(text); // 声オフでもアバターは話す
      return;
    }
    if (vv.enabled) voicevoxSpeak(text).catch(() => browserSpeak(text));
    else browserSpeak(text);
  }

  // ── 送信 ──
  async function send(text: string) {
    const value = text.trim();
    if (!value || busyRef.current) return;
    const next: ChatTurn[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setInput("");
    setBusy(true);
    busyRef.current = true;
    try {
      const res = await fetch("/api/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, avatarName: avatar.name }),
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
      busyRef.current = false;
      // 待受モードなら、応答後に再び聞き取りを開始
      if (standbyRef.current) setTimeout(() => standbyRef.current && startListening(), 900);
    }
  }

  // ── 音声入力 ──
  function startListening() {
    if (listening || recRef.current) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      alert("このブラウザは音声入力に対応していません。");
      setStandby(false);
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
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      // 待受中で、何も送信していない（無音）なら聞き取りを継続
      if (standbyRef.current && !busyRef.current) {
        setTimeout(() => standbyRef.current && startListening(), 400);
      }
    };
    rec.onerror = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      recRef.current = null;
    }
  }
  function stopListening() {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    recRef.current = null;
    setListening(false);
  }
  function toggleMic() {
    if (listening) stopListening();
    else startListening();
  }
  function toggleStandby() {
    const nextOn = !standby;
    setStandby(nextOn);
    standbyRef.current = nextOn;
    if (nextOn) startListening();
    else stopListening();
  }

  function clearMemory() {
    if (!confirm("これまでの会話の記憶を消します。よろしいですか?")) return;
    setMessages([]);
    try {
      localStorage.removeItem(MSG_KEY);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* アバター選択 */}
      <div className="flex flex-wrap items-center gap-2">
        <AvatarView avatar={avatar} state={avatarState} size={40} />
        <select
          value={avatarId}
          onChange={(e) => setAvatarId(e.target.value)}
          className="rounded-lg border border-line px-2 py-1.5 text-sm"
          title="アバター（キャラクター）を選ぶ"
        >
          {AVATARS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}（{a.desc}）
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-muted">前回の続きも覚えています</span>
      </div>

      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTts(!tts)}
          className={`rounded-full border px-3 py-1.5 text-sm ${tts ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
        >
          {tts ? "🔊 声オン" : "🔈 声オフ"}
        </button>
        <button
          onClick={toggleStandby}
          className={`rounded-full border px-3 py-1.5 text-sm ${standby ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
          title="待受モード：話しかけると自動で聞き取り→返答"
        >
          {standby ? "🎧 待受オン" : "🎧 待受オフ"}
        </button>
        <button
          onClick={() => setSlow(!slow)}
          className={`rounded-full border px-3 py-1.5 text-sm ${slow ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
        >
          {slow ? "🐢 ゆっくり中" : "🐢 ゆっくり"}
        </button>
        <button onClick={() => setFontIdx((fontIdx + 1) % FONT_SIZES.length)} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft">
          {FONT_LABELS[fontIdx]}
        </button>
        <button onClick={() => setShowVv(!showVv)} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft">
          ⚙️ 声設定
        </button>
        {messages.length > 0 && (
          <button onClick={clearMemory} className="ml-auto rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted">
            記憶を消す
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
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AvatarView avatar={avatar} state={avatarState} size={96} />
            <p className="text-sm text-ink-muted">「{avatar.name}」です。気軽に話しかけてください。聞き役になります。</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => (
              <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${FONT_SIZES[fontIdx]} ${
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
