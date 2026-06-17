// 選択可能な Claude モデル（許可リスト方式）。任意文字列は受け付けない。
export const ALLOWED_MODELS = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6（高速・低コスト）" },
  { id: "claude-opus-4-8", label: "Opus 4.8（高精度）" },
] as const;

export type AllowedModelId = (typeof ALLOWED_MODELS)[number]["id"];

/** 既定モデル（環境変数 ANTHROPIC_MODEL、未指定なら Sonnet 4.6） */
export const DEFAULT_MODEL: string =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function isAllowedModel(id: string | undefined | null): id is AllowedModelId {
  return !!id && ALLOWED_MODELS.some((m) => m.id === id);
}

/** 許可リストに無ければ既定にフォールバック */
export function resolveModel(model?: string): string {
  return isAllowedModel(model) ? model : DEFAULT_MODEL;
}
