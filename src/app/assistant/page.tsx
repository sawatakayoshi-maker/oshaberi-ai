import { AppShell } from "@/components/app-shell";
import { Assistant } from "@/components/assistant";

export default function AssistantPage() {
  return (
    <AppShell title="AI秘書" description="自然言語であなたの知識を検索・質問できます。">
      <Assistant />
    </AppShell>
  );
}
