"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatTurn, ToolAction } from "@/lib/types";
import { AvatarView } from "@/components/avatar";
import { AVATARS, findAvatar, type AvatarState } from "@/lib/avatars";

interface Contact {
  id: string;
  name: string;
  email: string;
}

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

export function Talk({ contacts = [] }: { contacts?: Contact[] }) {
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
  // VOICEVOX 話者一覧（名前で選択）
  const [vvSpeakers, setVvSpeakers] = useState<{ label: string; id: number }[]>([]);
  const [vvLoading, setVvLoading] = useState(false);
  const [vvError, setVvError] = useState<string | null>(null);
  // 機能C: Web検索
  const [web, setWeb] = useState(false);
  // 機能B: 確認待ちのアクション
  const [pending, setPending] = useState<ToolAction | null>(null);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");

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

  // VOICEVOX エンジンから話者・スタイル一覧を取得（男性話者も選択可能に）
  async function loadVvSpeakers() {
    setVvLoading(true);
    setVvError(null);
    try {
      const base = vv.url.replace(/\/+$/, "");
      const res = await fetch(`${base}/speakers`);
      if (!res.ok) throw new Error("speakers");
      const data = (await res.json()) as { name: string; styles: { name: string; id: number }[] }[];
      const opts = data.flatMap((sp) =>
        sp.styles.map((st) => ({ label: `${sp.name}（${st.name}）`, id: st.id }))
      );
      setVvSpeakers(opts);
      if (opts.length === 0) setVvError("話者が取得できませんでした。");
    } catch {
      setVvSpeakers([]);
      setVvError("VOICEVOX エンジンに接続できませんでした。起動中か URL をご確認ください（未起動時は端末の声になります）。");
    } finally {
      setVvLoading(false);
    }
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
        body: JSON.stringify({ messages: next, avatarName: avatar.name, web }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.reply) {
          setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
          speak(data.reply);
        }
        // 機能B: アクション提案があれば確認カードを表示（自動実行しない）
        if (data.action) {
          const a = data.action as ToolAction;
          setPending(a);
          if (a.tool === "draft_email") {
            setMailSubject(String(a.input.subject ?? ""));
            setMailBody(String(a.input.body ?? ""));
            setMailTo("");
          }
          if (!data.reply) {
            setMessages((m) => [...m, { role: "assistant", content: "下の内容で実行してよいか確認してね。" }]);
          }
        }
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

  function pushAssistant(content: string) {
    setMessages((m) => [...m, { role: "assistant", content }]);
  }

  // 機能B: 確認後にアクションを実行
  async function runAction() {
    if (!pending) return;
    const action = pending;
    setPending(null);

    if (action.tool === "draft_email") {
      const to = mailTo.trim();
      const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
      if (typeof window !== "undefined") window.location.href = href;
      pushAssistant("メールアプリを開きました（自動送信はしていません）。内容を確認して送信してください。");
      return;
    }

    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: action.tool, input: action.input }),
      });
      const data = await res.json();
      pushAssistant(res.ok ? data.message ?? "登録しました。" : "登録に失敗しました。");
    } catch {
      pushAssistant("登録に失敗しました。");
    }
  }
  function cancelAction() {
    setPending(null);
    pushAssistant("キャンセルしました。");
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
        <button
          onClick={() => setWeb(!web)}
          className={`rounded-full border px-3 py-1.5 text-sm ${web ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
          title="天気・ニュース等の最新情報を Web 検索（費用が増えます）"
        >
          {web ? "🔎 Web検索オン" : "🔎 Web検索"}
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
            <button
              type="button"
              onClick={loadVvSpeakers}
              disabled={vvLoading}
              className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-sunken disabled:opacity-50"
            >
              {vvLoading ? "取得中…" : "話者一覧を取得"}
            </button>
          </div>

          {/* 名前で話者・スタイルを選択（男性の声も） */}
          <div className="flex flex-wrap items-center gap-2">
            {vvSpeakers.length > 0 ? (
              <select
                value={vv.speaker}
                onChange={(e) => setVv({ ...vv, speaker: Number(e.target.value) })}
                className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5"
              >
                {/* 現在のIDが一覧に無い場合に備えて先頭に保持 */}
                {!vvSpeakers.some((s) => s.id === vv.speaker) && (
                  <option value={vv.speaker}>現在のID: {vv.speaker}</option>
                )}
                {vvSpeakers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}（ID:{s.id}）
                  </option>
                ))}
              </select>
            ) : (
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                話者ID
                <input
                  type="number"
                  value={vv.speaker}
                  onChange={(e) => setVv({ ...vv, speaker: Number(e.target.value) })}
                  className="w-24 rounded-lg border border-line px-2 py-1.5"
                />
              </label>
            )}
          </div>
          {vvError && <p className="text-xs text-red-600">{vvError}</p>}
          <p className="text-xs text-ink-muted">
            「話者一覧を取得」で VOICEVOX エンジンの話者・スタイルを名前で選べます（青山龍星 などの男性話者も）。
            ローカル起動時のみ高品質な声で話し、未起動時は端末の声になります（VOICEVOX 使用時はクレジット表示が必要）。
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

      {/* 機能B: 実行前の確認カード */}
      {pending && (
        <div className="rounded-2xl border border-accent bg-accent-soft p-4">
          <p className="mb-2 text-sm font-semibold text-accent">この内容で実行しますか?</p>

          {pending.tool === "create_task" && (
            <ul className="space-y-0.5 text-sm">
              <li>種別: タスク作成</li>
              <li>内容: {String(pending.input.title ?? "")}</li>
              {pending.input.due_hint ? <li>期限: {String(pending.input.due_hint)}</li> : null}
              {pending.input.priority ? (
                <li>優先度: {["なし", "低", "中", "高"][Number(pending.input.priority)] ?? "なし"}</li>
              ) : null}
            </ul>
          )}

          {pending.tool === "create_schedule" && (
            <ul className="space-y-0.5 text-sm">
              <li>種別: 予定登録（{pending.input.kind === "task" ? "締切タスク" : "タイムライン"}）</li>
              <li>内容: {String(pending.input.title ?? "")}</li>
              <li>
                日付: {String(pending.input.date ?? "")} {pending.input.time ? String(pending.input.time) : ""}
              </li>
            </ul>
          )}

          {pending.tool === "draft_email" && (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span>宛先:</span>
                {contacts.length > 0 && (
                  <select
                    onChange={(e) => setMailTo(e.target.value)}
                    className="rounded-lg border border-line px-2 py-1.5"
                  >
                    <option value="">連絡先から選択</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.email}>
                        {c.name}（{c.email}）
                      </option>
                    ))}
                  </select>
                )}
                <input
                  value={mailTo}
                  onChange={(e) => setMailTo(e.target.value)}
                  placeholder="メールアドレス（手入力可）"
                  className="min-w-0 flex-1 rounded-lg border border-line px-2 py-1.5"
                />
              </div>
              <input
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                placeholder="件名"
                className="w-full rounded-lg border border-line px-2 py-1.5"
              />
              <textarea
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-line px-2 py-1.5"
              />
              <p className="text-xs text-ink-muted">「メールを開く」で既定メールアプリに反映します（自動送信はしません）。</p>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button onClick={runAction} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
              {pending.tool === "draft_email" ? "メールを開く" : "実行する"}
            </button>
            <button onClick={cancelAction} className="rounded-lg border border-line px-4 py-2 text-sm">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {web && (
        <p className="text-xs text-ink-muted">🔎 Web検索オン：最新情報を検索します（検索利用料・本文トークンで費用が増えます）。</p>
      )}

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
