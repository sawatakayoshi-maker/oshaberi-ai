import type { CaptureClassification, IdeaScores } from "@/lib/types";

/**
 * AI 機能の抽象インターフェース。
 * 実装（Claude / OpenAI）を環境変数 AI_PROVIDER で差し替える。
 * すべてサーバー側でのみ実行すること（API キー秘匿）。
 */
export interface AIProvider {
  /** Quick Capture: 自由テキストを memo/task/idea/log に分類 */
  classifyCapture(text: string): Promise<CaptureClassification>;
  /** 本文の要約 */
  summarize(text: string): Promise<string>;
  /** タグ生成 */
  generateTags(text: string): Promise<string[]>;
  /** アイデアの 4 軸スコアリング */
  scoreIdea(input: { title: string; body: string }): Promise<IdeaScores>;
  /** AI 秘書: コンテキストを踏まえた回答 */
  answer(question: string, context: string): Promise<string>;
}

/** 分類の共通システムプロンプト */
export const CLASSIFY_SYSTEM = `あなたはセカンドブレイン用の高精度な分類アシスタントです。
ユーザーが素早く入力した断片的なテキストを、次のいずれかに振り分けます。
- "task": やること・行動・調査依頼（例「〜を調べる」「〜に連絡」「〜を作る」）
- "idea": 着想・構想・〜したら面白い 等
- "memo": 事実・記録・知識・参照情報
- "log": 出来事・日記・人生の記録
日本語で簡潔なタイトルを付け、関連タグ(0-5個)を抽出します。
タスクなら優先度(0なし/1低/2中/3高)と期限ヒント(あれば)を推定します。`;

/** 分類出力の JSON Schema（構造化出力の制約に使用） */
export const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["memo", "task", "idea", "log"] },
    title: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    priority: { type: "integer", enum: [0, 1, 2, 3] },
    due_hint: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    confidence: { type: "number" },
  },
  required: ["kind", "title", "tags", "priority", "due_hint", "summary", "confidence"],
  additionalProperties: false,
} as const;

/** 文字列を CaptureClassification に正規化（不正値のフォールバック） */
export function normalizeClassification(raw: unknown): CaptureClassification {
  const o = (raw ?? {}) as Record<string, unknown>;
  const kind = (["memo", "task", "idea", "log"] as const).includes(o.kind as never)
    ? (o.kind as CaptureClassification["kind"])
    : "memo";
  return {
    kind,
    title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : "無題",
    tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string").slice(0, 5) : [],
    priority: typeof o.priority === "number" ? Math.max(0, Math.min(3, Math.round(o.priority))) : 0,
    due_hint: typeof o.due_hint === "string" ? o.due_hint : null,
    summary: typeof o.summary === "string" ? o.summary : null,
    confidence: typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.5,
  };
}
