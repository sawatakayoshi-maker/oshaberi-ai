import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { signOut } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const provider = process.env.AI_PROVIDER || "claude";
  const model =
    provider === "openai"
      ? process.env.OPENAI_MODEL || "gpt-4o-mini"
      : process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

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

        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink-soft">AI</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">プロバイダ</dt>
              <dd>{provider}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">モデル</dt>
              <dd className="font-mono text-xs">{model}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-muted">
            環境変数 <code>AI_PROVIDER</code> / <code>ANTHROPIC_MODEL</code> / <code>OPENAI_MODEL</code> で変更できます。
          </p>
        </section>
      </div>
    </AppShell>
  );
}
