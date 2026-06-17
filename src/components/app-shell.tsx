import { Sidebar } from "@/components/sidebar";
import { QuickCapture } from "@/components/quick-capture";

/** 認証済みエリアの共通レイアウト（サイドバー + どこでも Quick Capture） */
export function AppShell({
  title,
  description,
  children,
  actions,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          <div className="mb-6">
            <QuickCapture />
          </div>
          {title && (
            <header className="mb-4 flex items-end justify-between">
              <div>
                <h1 className="text-xl font-semibold">{title}</h1>
                {description && (
                  <p className="text-sm text-ink-muted">{description}</p>
                )}
              </div>
              {actions}
            </header>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
