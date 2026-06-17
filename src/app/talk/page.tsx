import { AppShell } from "@/components/app-shell";
import { Talk } from "@/components/talk";

export default function TalkPage() {
  return (
    <AppShell title="お話" description="気軽に話せる相談相手。音声入力・読み上げに対応（VOICEVOX 任意）。">
      <Talk />
    </AppShell>
  );
}
