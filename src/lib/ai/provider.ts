import type { CaptureClassification, IdeaScores, ChatTurn, ChatResult } from "@/lib/types";

export interface ChatInput {
  system?: string;
  history: ChatTurn[];
  model?: string;
  web?: boolean; // Web検索を使う（機能C・課金増）
  actions?: boolean; // ツール実行（機能B・確認後に実行）
}

export interface ReportInput {
  prompt: string;
  model?: string;
  maxTokens?: number;
}

/**
 * AI 機能の抽象インターフェース。
 * 実装（Claude / OpenAI）を環境変数 AI_PROVIDER で差し替える。
 * すべてサーバー側でのみ実行すること（API キー秘匿）。
 * 各メソッドは任意で `model` を受け取り、未指定なら既定モデルを使う（機能B）。
 */
export interface AIProvider {
  /** Quick Capture: 自由テキストを memo/task/idea/log に分類 */
  classifyCapture(text: string, model?: string): Promise<CaptureClassification>;
  /** 本文の要約 */
  summarize(text: string, model?: string): Promise<string>;
  /** タグ生成 */
  generateTags(text: string, model?: string): Promise<string[]>;
  /** アイデアの 4 軸スコアリング */
  scoreIdea(input: { title: string; body: string }, model?: string): Promise<IdeaScores>;
  /** AI 秘書: コンテキストを踏まえた回答（web=true で Web検索も使用） */
  answer(question: string, context: string, model?: string, web?: boolean): Promise<string>;
  /** お話（会話）: システムプロンプト + 直近履歴から応答（機能A/B/C） */
  chat(input: ChatInput): Promise<ChatResult>;
  /** レポート生成: 組み立て済みプロンプトから Markdown を生成（機能C） */
  report(input: ReportInput): Promise<string>;
}

/** お話モードの既定ペルソナ（参考: おしゃべりAI 話し相手） */
export const TALK_SYSTEM = `あなたは「パーソナル ブレイン」の話し相手モードです。ユーザーにとって気軽に話せる友達のような相談相手でいてください。

【口調】ふだんはタメ口で、自然で気さくに。かしこまりすぎない。
【聞く姿勢】話すより聞くことを優先（聞く7割・話す3割）。返答は短めに、相手の言葉を受け止めて「〜って感じなんだね」と言い換え、「そのとき、どう思った?」のように問いを返す。アドバイスは求められてから。
【年配の方へ】一文を短く、やさしい言葉で、急かさない。
【やってはいけないこと】病名を断定しない。「こうすべき」と説教しない。相手を評価・非難しない。深刻な状態に見えるときは、信頼できる人や専門の窓口にやさしく相談を勧める。
【医療・お金・法律など重要な判断】具体的な助言や断定はせず、「わたしには正しく判断できないから」と正直に伝え、専門家や信頼できる家族への相談をやさしく勧める。気持ちは温かく受け止め、会話は続ける。
【記憶】これまでの会話の要約が渡ることがある。覚えている前提で自然に触れてよいが、相手が話していないことを決めつけない。
返答は基本は日本語で短めに。相手が他言語で話したら、その言語に合わせてやさしく短く返す。`;

/** レポート生成の既定システムプロンプト */
export const REPORT_SYSTEM = `あなたは優秀なアナリストです。与えられた素材と指示に基づき、日本語の Markdown で構造化されたレポートを作成してください。見出し(##)、箇条書き、要点の強調を適切に用い、結論・根拠・次のアクションが分かる構成にしてください。レポート本文のみを出力してください。`;

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
