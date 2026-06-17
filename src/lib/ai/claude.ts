import Anthropic from "@anthropic-ai/sdk";
import type { CaptureClassification, IdeaScores, ChatResult, ToolAction } from "@/lib/types";
import { resolveModel } from "@/lib/models";
import {
  type AIProvider,
  type ChatInput,
  type ReportInput,
  CLASSIFY_SYSTEM,
  CLASSIFY_SCHEMA,
  TALK_SYSTEM,
  REPORT_SYSTEM,
  normalizeClassification,
} from "./provider";

/** content から最初のテキストブロックを取り出す */
function firstText(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

/** content の全テキストブロックを連結（Web検索など複数ブロック対応） */
function allText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// 機能B: お話で実行を提案できるツール（自動実行せず、UIで確認後に実行）
const ACTION_TOOLS: Record<string, unknown>[] = [
  {
    name: "create_task",
    description: "ユーザーが「〜する」「〜を調べる」などやること・タスクの作成を依頼したとき。",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "タスクの内容" },
        due_hint: { type: "string", description: "期限のヒント（例: 明日, 2026-07-01）" },
        priority: { type: "integer", enum: [0, 1, 2, 3], description: "優先度 0なし/1低/2中/3高" },
      },
      required: ["title"],
    },
  },
  {
    name: "create_schedule",
    description: "日時のある予定の登録を依頼したとき。アプリ内のタイムライン/タスクに登録する。",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:MM（任意）" },
        kind: { type: "string", enum: ["timeline", "task"], description: "timeline=記録 / task=締切タスク" },
        description: { type: "string" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "draft_email",
    description: "メールの下書き作成を依頼したとき。件名と本文を作成する（送信はしない）。",
    input_schema: {
      type: "object",
      properties: {
        to_hint: { type: "string", description: "宛先の手がかり（名前など）" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["subject", "body"],
    },
  },
];
const ACTION_NAMES = new Set(ACTION_TOOLS.map((t) => t.name as string));

/** Claude (Anthropic) 実装 */
export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  /** 許可リスト検証込みでモデルを決定（既定は ANTHROPIC_MODEL） */
  private pick(model?: string): string {
    return resolveModel(model);
  }

  async classifyCapture(text: string, model?: string): Promise<CaptureClassification> {
    const res = await this.client.messages.create({
      model: this.pick(model),
      max_tokens: 1024,
      system: CLASSIFY_SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: CLASSIFY_SCHEMA },
      },
      messages: [{ role: "user", content: text }],
    } as Anthropic.MessageCreateParamsNonStreaming);

    return normalizeClassification(JSON.parse(firstText(res) || "{}"));
  }

  async summarize(text: string, model?: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.pick(model),
      max_tokens: 1024,
      system: "次の文章を日本語で簡潔に要約してください。箇条書き可。要約のみ出力。",
      messages: [{ role: "user", content: text }],
    });
    return firstText(res).trim();
  }

  async generateTags(text: string, model?: string): Promise<string[]> {
    const res = await this.client.messages.create({
      model: this.pick(model),
      max_tokens: 256,
      system: "本文から検索に有用なタグを最大5個、JSON配列(文字列)だけで出力。",
      output_config: {
        format: { type: "json_schema", schema: { type: "array", items: { type: "string" } } },
      },
      messages: [{ role: "user", content: text }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    const arr = JSON.parse(firstText(res) || "[]");
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string").slice(0, 5) : [];
  }

  async scoreIdea(input: { title: string; body: string }, model?: string): Promise<IdeaScores> {
    const res = await this.client.messages.create({
      model: this.pick(model),
      max_tokens: 512,
      system:
        "アイデアを市場性(market)・実現性(feasibility)・収益性(profitability)・将来性(future)の4軸で各0-100点評価。JSONのみ。",
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              market: { type: "integer" },
              feasibility: { type: "integer" },
              profitability: { type: "integer" },
              future: { type: "integer" },
            },
            required: ["market", "feasibility", "profitability", "future"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: `タイトル: ${input.title}\n説明: ${input.body}` }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    return JSON.parse(firstText(res) || "{}") as IdeaScores;
  }

  async answer(question: string, context: string, model?: string, web?: boolean): Promise<string> {
    const tools: Record<string, unknown>[] = [];
    if (web) tools.push({ type: "web_search_20260209", name: "web_search" });
    const system = web
      ? "あなたはユーザーのセカンドブレインの秘書です。提供された関連情報に加え、必要に応じて Web検索の結果も用い、最新情報を踏まえて日本語で簡潔に回答し、出典や根拠を示してください。"
      : "あなたはユーザーのセカンドブレインの秘書です。提供された関連情報のみを根拠に、日本語で簡潔に回答し、根拠を示してください。";
    const params = {
      model: this.pick(model),
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: `# 質問\n${question}\n\n# 関連情報\n${context}` }],
      ...(tools.length ? { tools } : {}),
    };
    const res = await this.client.messages.create(
      params as unknown as Anthropic.MessageCreateParamsNonStreaming
    );
    return allText(res);
  }

  async chat({ system, history, model, web, actions }: ChatInput): Promise<ChatResult> {
    const tools: Record<string, unknown>[] = [];
    if (web) tools.push({ type: "web_search_20260209", name: "web_search" });
    if (actions) tools.push(...ACTION_TOOLS);

    const params = {
      model: this.pick(model),
      max_tokens: web ? 1536 : 1024,
      // システムプロンプトはプロンプトキャッシュ対象にして入力コストを抑える
      system: [{ type: "text", text: system ?? TALK_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: history.map((h) => ({ role: h.role, content: h.content })),
      ...(tools.length ? { tools } : {}),
    };
    const res = await this.client.messages.create(
      params as unknown as Anthropic.MessageCreateParamsNonStreaming
    );

    let reply = "";
    let action: ToolAction | undefined;
    for (const block of res.content) {
      if (block.type === "text") reply += block.text;
      else if (block.type === "tool_use" && ACTION_NAMES.has(block.name)) {
        // 自動実行しない。UI で確認後に実行する提案として返す。
        action = { tool: block.name, input: (block.input ?? {}) as Record<string, unknown> };
      }
    }
    return { reply: reply.trim(), action };
  }

  async report({ prompt, model, maxTokens }: ReportInput): Promise<string> {
    const res = await this.client.messages.create({
      model: this.pick(model),
      max_tokens: maxTokens ?? 4096,
      system: REPORT_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    return firstText(res).trim();
  }
}
