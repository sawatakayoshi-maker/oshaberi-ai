import type { ItemKind } from "@/lib/types";

export const KIND_LABEL: Record<ItemKind, string> = {
  memo: "メモ",
  task: "タスク",
  idea: "アイデア",
  log: "ログ",
};

export const KIND_ICON: Record<ItemKind, string> = {
  memo: "✎",
  task: "☑",
  idea: "✦",
  log: "↗",
};

export const PRIORITY_LABEL: Record<number, string> = {
  0: "",
  1: "低",
  2: "中",
  3: "高",
};

export const SCORE_AXES: { key: keyof IdeaScoresKeys; label: string }[] = [
  { key: "market", label: "市場性" },
  { key: "feasibility", label: "実現性" },
  { key: "profitability", label: "収益性" },
  { key: "future", label: "将来性" },
];

type IdeaScoresKeys = {
  market: number;
  feasibility: number;
  profitability: number;
  future: number;
};
