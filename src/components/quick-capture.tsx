"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CaptureClassification } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  memo: "メモ",
  task: "タスク",
  idea: "アイデア",
  log: "ログ",
};

/** どこからでも 3 秒で入力できる Quick Capture バー */
export function QuickCapture() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<CaptureClassification | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ⌘K / Ctrl+K でフォーカス
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setText("");
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = await res.json();
      if (res.ok) {
        setLast(data.classification);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-2 shadow-sm">
      <form onSubmit={submit} className="flex items-center gap-2">
        <span className="pl-2 text-ink-muted">＋</span>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="頭に浮かんだことを入力…（⌘K）AIが自動で振り分けます"
          className="flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "振り分け中…" : "追加"}
        </button>
      </form>
      {last && (
        <p className="px-3 py-1.5 text-xs text-ink-muted">
          → <b className="text-accent">{KIND_LABEL[last.kind]}</b> として保存:「{last.title}」
          {last.tags.length > 0 && <> ・ {last.tags.map((t) => `#${t}`).join(" ")}</>}
        </p>
      )}
    </div>
  );
}
