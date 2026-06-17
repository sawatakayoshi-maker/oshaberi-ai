"use client";

import { useState } from "react";
import { saveReport } from "@/lib/actions";
import { KIND_LABEL } from "@/lib/constants";
import type { ItemKind } from "@/lib/types";

interface SourceItem {
  id: string;
  kind: ItemKind;
  title: string;
  body: string;
}

export function ReportBuilder({ items }: { items: SourceItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [instruction, setInstruction] = useState("選択した項目を整理し、要点・背景・次のアクションが分かる日本語レポートにまとめてください。");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [report, setReport] = useState("");
  const [generating, setGenerating] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 選択項目 + 指示からプロンプトを組み立てる（送信前に編集可能）
  function build() {
    const picked = items.filter((i) => selected.has(i.id));
    const material = picked
      .map((i) => `- [${KIND_LABEL[i.kind]}] ${i.title}\n  ${i.body?.slice(0, 600) || ""}`)
      .join("\n");
    setPrompt(
      `# 指示\n${instruction}\n\n# 素材（${picked.length}件）\n${material || "（素材なし）"}\n\n# 出力\n日本語の Markdown レポート。`
    );
  }

  async function generate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setReport("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setReport(res.ok ? data.report : "レポート生成に失敗しました。");
    } finally {
      setGenerating(false);
    }
  }

  function download() {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "report"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* 1. 素材選択 */}
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink-soft">1. 素材を選ぶ（{selected.size} 件）</h2>
        <ul className="max-h-64 space-y-1 overflow-auto">
          {items.map((i) => (
            <li key={i.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-sunken">
                <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                <span className="shrink-0 text-xs text-ink-muted">[{KIND_LABEL[i.kind]}]</span>
                <span className="truncate">{i.title}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. 指示 + 組み立て */}
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink-soft">2. 指示を書いてプロンプトを組み立てる</h2>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
        <button onClick={build} className="mt-2 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-sunken">
          プロンプトを組み立てる
        </button>
        {prompt && (
          <>
            <p className="mt-3 mb-1 text-xs text-ink-muted">送信前にプロンプトを確認・編集できます（コスト把握のため）。</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-line px-3 py-2 font-mono text-xs"
            />
            <button
              onClick={generate}
              disabled={generating}
              className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {generating ? "生成中…" : "レポート生成"}
            </button>
          </>
        )}
      </section>

      {/* 3. 結果 */}
      {report && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink-soft">3. レポート</h2>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-sunken p-3 text-sm">{report}</pre>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="レポート名"
              className="rounded-lg border border-line px-3 py-2 text-sm"
            />
            <form action={saveReport}>
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="body" value={report} />
              <button className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-sunken">メモとして保存</button>
            </form>
            <button onClick={download} className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-sunken">
              .md ダウンロード
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
