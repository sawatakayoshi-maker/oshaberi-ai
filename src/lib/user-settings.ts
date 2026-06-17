import type { SupabaseClient } from "@supabase/supabase-js";
import { isAllowedModel } from "@/lib/models";

/**
 * ユーザーが選択した AI モデル（profiles.settings.ai_model）を返す。
 * 未設定 / 不正値なら undefined（呼び出し側で既定にフォールバック）。
 */
export async function getUserModel(
  supabase: SupabaseClient,
  userId: string
): Promise<string | undefined> {
  const { data } = await supabase.from("profiles").select("settings").eq("id", userId).single();
  const m = (data?.settings as Record<string, unknown> | null)?.ai_model;
  return isAllowedModel(typeof m === "string" ? m : undefined) ? (m as string) : undefined;
}
