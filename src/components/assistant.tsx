"use client";

import { useState } from "react";
import Link from "next/link";
import { KIND_LABEL } from "@/lib/constants";
import type { ItemKind } from "@/lib/types";

interface Source {
  id: string;
  kind: ItemKind;
  title: string;
}

const EXAMPLES = [
  "去年考えた補助金関連のアイデアを表示",
  "水素関連で止まっている案件は？",
  "最近更新していない重要メモは？",
];

export function Assistant() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);

  async function ask(question: string) {
    const value = question.trim();
    if (!value || loading) return;
    setLoading(true);
    setAnswer(null);
    setSources([]);
    try {
      const res = await fetch("/api/assistant/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: value }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnswer(data.answer);
        setSources(data.sources ?? []);
      } else {
        setAnswer("検索に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例: 水素関連で止まっている案件は？"
          className="flex-1 rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button disabled={loading} className="rounded-xl bg-accent px-5 text-sm font-medium text-white disabled:opacity-50">
          {loading ? "検索中…" : "質問"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQ(ex);
              ask(ex);
            }}
            className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted hover:border-accent hover:text-accent"
          >
            {ex}
          </button>
        ))}
      </div>

      {answer && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
          {sources.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 text-xs font-semibold text-ink-muted">関連情報</p>
              <ul className="space-y-1">
                {sources.map((s) => (
                  <li key={s.id} className="text-sm">
                    <Link href={`/${s.kind === "task" ? "tasks" : s.kind === "idea" ? "ideas" : "memos"}`} className="text-accent hover:underline">
                      [{KIND_LABEL[s.kind]}] {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
