import Anthropic from "@anthropic-ai/sdk";
import type { CaptureClassification, IdeaScores } from "@/lib/types";
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

  async answer(question: string, context: string, model?: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.pick(model),
      max_tokens: 2048,
      system:
        "あなたはユーザーのセカンドブレインの秘書です。提供された関連情報のみを根拠に、日本語で簡潔に回答し、根拠を示してください。",
      messages: [{ role: "user", content: `# 質問\n${question}\n\n# 関連情報\n${context}` }],
    });
    return firstText(res).trim();
  }

  async chat({ system, history, model }: ChatInput): Promise<string> {
    const res = await this.client.messages.create({
      model: this.pick(model),
      max_tokens: 1024,
      // システムプロンプトはプロンプトキャッシュ対象にして入力コストを抑える
      system: [
        { type: "text", text: system ?? TALK_SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: history.map((h) => ({ role: h.role, content: h.content })),
    } as Anthropic.MessageCreateParamsNonStreaming);
    return firstText(res).trim();
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
