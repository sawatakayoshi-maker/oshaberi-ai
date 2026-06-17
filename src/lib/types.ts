// ドメイン型（DB と AI レイヤーで共有）

export type ItemKind = "memo" | "task" | "idea" | "log";

export interface Item {
  id: string;
  user_id: string;
  kind: ItemKind;
  title: string;
  body: string;
  status: string | null;
  priority: number; // 0..3
  due_at: string | null;
  remind_at: string | null;
  project_id: string | null;
  tree_node_id: string | null;
  source: string;
  ai_summary: string | null;
  scores: IdeaScores | null;
  url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IdeaScores {
  market: number; // 市場性 0..100
  feasibility: number; // 実現性
  profitability: number; // 収益性
  future: number; // 将来性
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  item_id: string | null;
  read_at: string | null;
  created_at: string;
}

// ---- AI 出力型 ----

/** Quick Capture の分類結果 */
export interface CaptureClassification {
  kind: ItemKind;
  title: string;
  tags: string[];
  priority: number; // 0..3
  due_hint: string | null; // "明日", "2026-07-01" 等の自然言語/ISO ヒント
  summary: string | null;
  confidence: number; // 0..1
}

/** お話（会話）の1ターン */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** お話のツール実行（確認後に実行する提案） */
export interface ToolAction {
  tool: string; // create_task / create_schedule / draft_email
  input: Record<string, unknown>;
}

/** chat() の戻り値（応答テキスト + 任意のアクション提案） */
export interface ChatResult {
  reply: string;
  action?: ToolAction;
}
