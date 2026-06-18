"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatTurn, ToolAction } from "@/lib/types";
import { AvatarView } from "@/components/avatar";
import { AVATARS, findAvatar, type AvatarState } from "@/lib/avatars";
import { TALK_I18N, LANGS, type LangCode } from "@/lib/talk-i18n";

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
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex?: number }) => void)
    | null;
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
const NOTE_KEY = "pb:note"; // ずっと覚えておくメモ
const LANG_KEY = "pb:lang"; // 表示・会話の言語
const FONT_SIZES = ["text-sm", "text-base", "text-lg"];

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
  const [avatarId, setAvatarId] = useState<string>("real_f");
  const [fontIdx, setFontIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false); // 発話中（口パク用）
  const [note, setNote] = useState(""); // ずっと覚えておくメモ
  const [showNote, setShowNote] = useState(false);
  const [lang, setLang] = useState<LangCode>("ja"); // 表示・会話の言語
  const [copied, setCopied] = useState(false);
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
  const speakingRef = useRef(false); // 発話中かどうか（待受の制御に使用）
  const restored = useRef(false);
  const pulseRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null); // 応答生成の中断用
  // ③ 逐次読み上げキュー / ② クールダウン・エコー判定 / マイクストリーム
  const speakQueueRef = useRef<string[]>([]);
  const speakActiveRef = useRef(false);
  const cooldownRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastAiRef = useRef(""); // 直近のAI発話（エコー誤認の保険）
  const micStreamRef = useRef<MediaStream | null>(null);

  const avatar = findAvatar(avatarId);
  const t = TALK_I18N[lang]; // 現在の言語の表示ラベル
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
      const nt = localStorage.getItem(NOTE_KEY);
      if (nt) setNote(nt);
      const lg = localStorage.getItem(LANG_KEY);
      if (lg) setLang(lg as LangCode);
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

  // メモの保存
  useEffect(() => {
    try {
      localStorage.setItem(NOTE_KEY, note);
    } catch {
      /* noop */
    }
  }, [note]);

  // 言語の保存
  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* noop */
    }
  }, [lang]);

  // 発話中はマイクを止める（自分の声を拾うループ防止）。再開はクールダウン後に syncMic が行う。
  useEffect(() => {
    speakingRef.current = speaking;
    if (speaking) stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speaking]);

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
  // 1文を端末の声で読み上げ（終了で resolve）
  function browserSpeakOne(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setTimeout(resolve, Math.min(6000, 800 + text.length * 60));
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = speechRate();
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }
  // 1文を VOICEVOX で読み上げ（終了で resolve、失敗で端末の声へ）
  async function voicevoxSpeakOne(text: string): Promise<void> {
    try {
      const res = await fetch("/api/voicevox/synth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: vv.url, speaker: vv.speaker, text, speedScale: speechRate() }),
      });
      if (!res.ok) throw new Error("synthesis");
      const url = URL.createObjectURL(await res.blob());
      audioRef.current?.pause();
      const a = new Audio(url);
      audioRef.current = a;
      await a.play();
      await new Promise<void>((resolve) => {
        const done = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        a.onended = done;
        a.onerror = done;
      });
    } catch {
      await browserSpeakOne(text);
    }
  }
  async function speakOne(text: string): Promise<void> {
    if (!tts) {
      // 声オフ：アバターの口パクのみ（概算時間）
      await new Promise<void>((r) => setTimeout(r, Math.min(5000, 600 + text.length * 55)));
      return;
    }
    if (vv.enabled) await voicevoxSpeakOne(text);
    else await browserSpeakOne(text);
  }
  // ③ 文を読み上げキューに積む（最初の文が来た時点で再生開始）
  function enqueueSpeak(text: string) {
    const s = text.trim();
    if (!s) return;
    lastAiRef.current = (lastAiRef.current + " " + s).slice(-400); // エコー判定用に直近AI発話を保持
    speakQueueRef.current.push(s);
    void pumpSpeak();
  }
  async function pumpSpeak() {
    if (speakActiveRef.current) return;
    speakActiveRef.current = true;
    speakingRef.current = true;
    setSpeaking(true);
    stopListening();
    while (speakQueueRef.current.length) {
      const s = speakQueueRef.current.shift();
      if (!s) break;
      try {
        await speakOne(s);
      } catch {
        /* noop */
      }
    }
    speakActiveRef.current = false;
    speakingRef.current = false;
    setSpeaking(false);
    startCooldown(); // 読み上げ後にクールダウン→マイク再開
  }
  // ② 読み上げ終了後のクールダウン（残響・回り込みの取りこぼし送信を防ぐ）
  function startCooldown() {
    cooldownRef.current = true;
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      cooldownRef.current = false;
      syncMic();
    }, 900);
  }

  // VOICEVOX エンジンから話者・スタイル一覧を取得（男性話者も選択可能に）
  async function loadVvSpeakers() {
    setVvLoading(true);
    setVvError(null);
    try {
      const res = await fetch(`/api/voicevox/speakers?url=${encodeURIComponent(vv.url)}`);
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

  // ── 送信（③ ストリーミング受信＋逐次読み上げ）──
  async function send(text: string) {
    const value = text.trim();
    if (!value || busyRef.current) return;
    stopListening(); // 処理中はマイクを止める
    cooldownRef.current = false;
    clearTimeout(cooldownTimerRef.current);
    const next: ChatTurn[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setInput("");
    setBusy(true);
    busyRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, avatarName: avatar.name, web, note, lang }),
        signal: controller.signal,
      });
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("ndjson") && res.body) {
        await consumeStream(res.body);
      } else {
        const data = await res.json();
        if (res.ok) {
          if (data.reply) {
            pushAssistant(data.reply);
            enqueueSpeak(data.reply);
          }
          if (data.action) handleAction(data.action as ToolAction, !!data.reply);
        } else {
          pushAssistant("うまく応答できなかったみたい。もう一度試してね。");
        }
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        pushAssistant("うまく応答できなかったみたい。もう一度試してね。");
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      busyRef.current = false;
      syncMic(); // 待受なら（発話中でなければ）聞き取りを再開
    }
  }

  // NDJSON ストリームを読み、文字を逐次表示＋文単位で読み上げキューへ
  async function consumeStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let full = "";
    let spokenLen = 0;
    setMessages((m) => [...m, { role: "assistant", content: "" }]); // 受信用の空メッセージ
    const flushSentences = (final: boolean) => {
      const rest = full.slice(spokenLen);
      const re = /[^。．！？!?\n]*[。．！？!?\n]+/g;
      let mt: RegExpExecArray | null;
      let consumed = 0;
      while ((mt = re.exec(rest))) {
        enqueueSpeak(mt[0]);
        consumed = re.lastIndex;
      }
      if (consumed) spokenLen += consumed;
      if (final) {
        const tail = full.slice(spokenLen).trim();
        if (tail) {
          enqueueSpeak(tail);
          spokenLen = full.length;
        }
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev: { type?: string; text?: string; action?: ToolAction };
        try {
          ev = JSON.parse(line);
        } catch {
          continue;
        }
        if (ev.type === "delta" && typeof ev.text === "string") {
          full += ev.text;
          const cur = full;
          setMessages((m) => {
            const c = [...m];
            if (c.length) c[c.length - 1] = { role: "assistant", content: cur };
            return c;
          });
          flushSentences(false);
        } else if (ev.type === "done") {
          flushSentences(true);
          if (ev.action) handleAction(ev.action, full.length > 0);
        } else if (ev.type === "error" && !full) {
          setMessages((m) => {
            const c = [...m];
            if (c.length) c[c.length - 1] = { role: "assistant", content: "うまく応答できなかったみたい。もう一度試してね。" };
            return c;
          });
        }
      }
    }
  }

  // 機能B: アクション提案を確認カードに載せる
  function handleAction(a: ToolAction, hadReply: boolean) {
    setPending(a);
    if (a.tool === "draft_email") {
      setMailSubject(String(a.input.subject ?? ""));
      setMailBody(String(a.input.body ?? ""));
      setMailTo("");
    }
    if (!hadReply) pushAssistant("下の内容で実行してよいか確認してね。");
  }

  // ── マイク制御（① 単一ルール：待受ON かつ AI非発話 かつ 非処理中 かつ 非クールダウンのときだけ聞く）──
  function micShouldBeOn() {
    return standbyRef.current && !speakingRef.current && !busyRef.current && !cooldownRef.current;
  }
  function syncMic() {
    if (micShouldBeOn()) {
      if (!recRef.current) startListening();
    } else if (recRef.current) {
      stopListening();
    }
  }
  // 直前のAI発話と酷似する認識結果はエコー誤認として無視
  function isEcho(text: string) {
    const norm = (s: string) => s.replace(/[\s　、。．，！？!?,.「」『』]/g, "").toLowerCase();
    const a = norm(text);
    const b = norm(lastAiRef.current);
    if (a.length < 4 || !b) return false;
    return b.includes(a) || a.includes(b);
  }
  function consumeResult(text: string) {
    // ② AI発話中／クールダウン中／処理中の認識結果は破棄（自問自答ループ防止）
    if (speakingRef.current || busyRef.current || cooldownRef.current) return;
    const v = text.trim();
    if (!v || isEcho(v)) return;
    send(v);
  }

  // ① 待受は continuous=true の連続認識。onend/onerror でも聞くべき状態なら即再起動。
  function startListening() {
    if (recRef.current) return;
    if (!micShouldBeOn()) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      alert("このブラウザは音声入力に対応していません。");
      setStandby(false);
      standbyRef.current = false;
      return;
    }
    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      let s = "";
      const from = typeof e.resultIndex === "number" ? e.resultIndex : 0;
      for (let i = from; i < e.results.length; i++) s += e.results[i][0].transcript;
      consumeResult(s);
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      if (micShouldBeOn()) setTimeout(syncMic, 150); // 穴を作らず即再起動
    };
    rec.onerror = () => {
      recRef.current = null;
      setListening(false);
      if (micShouldBeOn()) setTimeout(syncMic, 300); // no-speech 等でも静かに再起動
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
    }
  }
  function stopListening() {
    const rec = recRef.current;
    recRef.current = null;
    setListening(false);
    if (rec) {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
  }
  // 手動マイク（プッシュトゥトーク）：1回だけ聞き取って送信
  function toggleMic() {
    if (recRef.current) {
      stopListening();
      return;
    }
    if (speakingRef.current || busyRef.current) return;
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
      const from = typeof e.resultIndex === "number" ? e.resultIndex : 0;
      for (let i = from; i < e.results.length; i++) s += e.results[i][0].transcript;
      consumeResult(s);
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };
    rec.onerror = () => {
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
    }
  }
  // ② マイクのAEC（回り込み軽減）。待受ON時に getUserMedia でエコーキャンセル等を有効化。
  async function primeMic() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      /* 権限拒否などは無視 */
    }
  }
  function stopMicStream() {
    try {
      micStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    } catch {
      /* noop */
    }
    micStreamRef.current = null;
  }
  async function toggleStandby() {
    const nextOn = !standby;
    setStandby(nextOn);
    standbyRef.current = nextOn;
    if (nextOn) {
      await primeMic();
      syncMic();
    } else {
      stopListening();
      stopMicStream();
    }
  }

  // ── 会話を止める（読み上げ・音声・応答生成をまとめて停止）──
  function stopAll() {
    // 1. 読み上げ（端末の声）を停止
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* noop */
    }
    // 2. VOICEVOX の再生中音声を停止
    try {
      audioRef.current?.pause();
    } catch {
      /* noop */
    }
    clearTimeout(pulseRef.current);
    // 読み上げキューを全消去（③ 停止ボタンで即止まる）
    speakQueueRef.current = [];
    speakActiveRef.current = false;
    speakingRef.current = false;
    setSpeaking(false);
    cooldownRef.current = false;
    clearTimeout(cooldownTimerRef.current);
    // 3. 応答生成中なら中断
    try {
      abortRef.current?.abort();
    } catch {
      /* noop */
    }
    // 4. 待受・聞き取りも止めて会話を完全に停止
    standbyRef.current = false;
    setStandby(false);
    stopListening();
    stopMicStream();
    setBusy(false);
    busyRef.current = false;
  }

  function clearMemory() {
    if (!confirm(t.clearConfirm)) return;
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

  // 会話をクリップボードにコピー（失敗時は execCommand にフォールバック）
  async function copyText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fallthrough */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
  async function copyAll() {
    if (messages.length === 0) return;
    const text = messages.map((m) => `${m.role === "user" ? "🧑" : "🤖"} ${m.content}`).join("\n\n");
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* アバター・言語選択 */}
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
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LangCode)}
          className="rounded-lg border border-line px-2 py-1.5 text-sm"
          title="言語を選ぶ / Language"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              🌐 {l.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-muted">{t.remembers}</span>
      </div>

      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTts(!tts)}
          className={`rounded-full border px-3 py-1.5 text-sm ${tts ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
        >
          {tts ? t.voiceOn : t.voiceOff}
        </button>
        <button
          onClick={toggleStandby}
          className={`rounded-full border px-3 py-1.5 text-sm ${standby ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
          title="待受モード：話しかけると自動で聞き取り→返答"
        >
          {standby ? t.standbyOn : t.standbyOff}
        </button>
        <button
          onClick={() => setSlow(!slow)}
          className={`rounded-full border px-3 py-1.5 text-sm ${slow ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
        >
          {slow ? t.slowOn : t.slow}
        </button>
        <button onClick={() => setFontIdx((fontIdx + 1) % FONT_SIZES.length)} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft">
          {t.fontLabels[fontIdx]}
        </button>
        <button
          onClick={() => setWeb(!web)}
          className={`rounded-full border px-3 py-1.5 text-sm ${web ? "border-accent bg-accent text-white" : "border-line text-ink-soft"}`}
          title="天気・ニュース等の最新情報を Web 検索（費用が増えます）"
        >
          {web ? t.webOn : t.web}
        </button>
        <button onClick={() => setShowVv(!showVv)} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft">
          {t.voiceSet}
        </button>
        <button
          onClick={stopAll}
          className={`rounded-full border px-3 py-1.5 text-sm ${busy || speaking ? "border-red-500 bg-red-500 text-white" : "border-line text-ink-soft"}`}
          title="読み上げ・応答を止める"
        >
          {t.stop}
        </button>
        <button
          onClick={() => setShowNote(!showNote)}
          className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft"
          title="ずっと覚えておくメモ（毎回かならずAIに伝わります）"
        >
          {t.note}
        </button>
        {messages.length > 0 && (
          <button onClick={copyAll} className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft" title="会話を全部コピー">
            {copied ? `✓ ${t.copied}` : t.copy}
          </button>
        )}
        {messages.length > 0 && (
          <button onClick={clearMemory} className="ml-auto rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted">
            {t.clear}
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

      {showNote && (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3 text-sm">
          <div className="font-medium">{t.noteTitle}</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            placeholder={"ここに書いたことは、これからずっと覚えています。\n例）わたしの名前は〇〇。孫は△△と□□。膝が悪い。甘いものが好き。朝はゆっくり話したい。"}
            className="w-full rounded-lg border border-line px-2 py-1.5"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-muted">{t.noteHint}</span>
            <button
              onClick={() => setShowNote(false)}
              className="shrink-0 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white"
            >
              {t.noteClose}
            </button>
          </div>
        </div>
      )}

      {/* 会話 */}
      <div className="min-h-[320px] rounded-2xl border border-line bg-surface p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AvatarView avatar={avatar} state={avatarState} size={96} />
            <p className="text-sm text-ink-muted">
              {avatar.name}
              {t.introSuffix}
            </p>
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
            {busy && <li className="text-sm text-ink-muted">{t.thinking}</li>}
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
        <p className="text-xs text-ink-muted">{t.webNote}</p>
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
          placeholder={t.placeholder}
          className="flex-1 rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button disabled={busy} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {t.send}
        </button>
      </form>
    </div>
  );
}
