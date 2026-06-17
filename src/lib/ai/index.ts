import type { AIProvider } from "./provider";
import { ClaudeProvider } from "./claude";
import { OpenAIProvider } from "./openai";

let cached: AIProvider | null = null;

/**
 * 既定の AI プロバイダを返す（環境変数 AI_PROVIDER で選択、既定は claude）。
 * サーバー側でのみ呼び出すこと。
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const which = (process.env.AI_PROVIDER || "claude").toLowerCase();
  cached = which === "openai" ? new OpenAIProvider() : new ClaudeProvider();
  return cached;
}

export type { AIProvider } from "./provider";
