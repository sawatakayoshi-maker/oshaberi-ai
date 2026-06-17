import OpenAI from "openai";
import type { CaptureClassification, IdeaScores } from "@/lib/types";
import {
  type AIProvider,
  CLASSIFY_SYSTEM,
  CLASSIFY_SCHEMA,
  normalizeClassification,
} from "./provider";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/** OpenAI 実装 */
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  private async json<T>(
    system: string,
    user: string,
    schema: Record<string, unknown>,
    name: string
  ): Promise<T> {
    const res = await this.client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name, schema, strict: false },
      },
    });
    return JSON.parse(res.choices[0]?.message?.content || "{}") as T;
  }

  private async text(system: string, user: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return (res.choices[0]?.message?.content || "").trim();
  }

  async classifyCapture(text: string): Promise<CaptureClassification> {
    const raw = await this.json(
      CLASSIFY_SYSTEM,
      text,
      CLASSIFY_SCHEMA as unknown as Record<string, unknown>,
      "classification"
    );
    return normalizeClassification(raw);
  }

  async summarize(text: string): Promise<string> {
    return this.text("次の文章を日本語で簡潔に要約してください。要約のみ出力。", text);
  }

  async generateTags(text: string): Promise<string[]> {
    const out = await this.json<{ tags: string[] }>(
      "本文から検索に有用なタグを最大5個抽出し {tags:string[]} で返す。",
      text,
      {
        type: "object",
        properties: { tags: { type: "array", items: { type: "string" } } },
        required: ["tags"],
      },
      "tags"
    );
    return Array.isArray(out.tags) ? out.tags.slice(0, 5) : [];
  }

  async scoreIdea(input: { title: string; body: string }): Promise<IdeaScores> {
    return this.json<IdeaScores>(
      "アイデアを市場性(market)・実現性(feasibility)・収益性(profitability)・将来性(future)の4軸で各0-100点評価。",
      `タイトル: ${input.title}\n説明: ${input.body}`,
      {
        type: "object",
        properties: {
          market: { type: "integer" },
          feasibility: { type: "integer" },
          profitability: { type: "integer" },
          future: { type: "integer" },
        },
        required: ["market", "feasibility", "profitability", "future"],
      },
      "idea_scores"
    );
  }

  async answer(question: string, context: string): Promise<string> {
    return this.text(
      "あなたはユーザーのセカンドブレインの秘書です。提供された関連情報のみを根拠に、日本語で簡潔に回答してください。",
      `# 質問\n${question}\n\n# 関連情報\n${context}`
    );
  }
}
