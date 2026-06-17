import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { signOut, updateAiModel } from "@/lib/actions";
import { ALLOWED_MODELS, DEFAULT_MODEL } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const provider = process.env.AI_PROVIDER || "claude";

  // 現在選択中のモデル（profiles.settings.ai_model）
  let currentModel = DEFAULT_MODEL;
  if (user) {
    const { data } = await supabase.from("profiles").select("settings").eq("id", user.id).single();
    const m = (data?.settings as Record<string, unknown> | null)?.ai_model;
    if (typeof m === "string") currentModel = m;
  }

  return (
    <AppShell title="設定">
      <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink-soft">アカウント</h2>
          <p className="text-sm text-ink-muted">{user?.email}</p>
          <form action={signOut} className="mt-3">
            <button className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-sunken">
              ログアウト
            </button>
          </form>
        </section>

        {/* 機能B: モデル選択 */}
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink-soft">AI モデル</h2>
          <p className="mb-3 text-xs text-ink-muted">
            プロバイダ: <b>{provider}</b>（Claude のときのみモデル選択が有効）
          </p>
          <form action={updateAiModel} className="flex flex-wrap items-center gap-2">
            <select name="model" defaultValue={currentModel} className="rounded-lg border border-line px-3 py-2 text-sm">
              {ALLOWED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">保存</button>
          </form>
          <p className="mt-2 text-xs text-ink-muted">
            選択は保存され、Quick Capture・要約・スコアリング・お話・レポートなど全機能に反映されます。
          </p>
        </section>
      </div>
    </AppShell>
  );
}
