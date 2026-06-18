// アバター（キャラクター）レジストリ。クライアント安全（サーバ依存なし）。
// 3 種類の表示方式をサポート：
//  - svg   : 内蔵のインラインSVG（待機/発話/考え中で表情が変化。アセット不要）
//  - image : 1キャラ=1枚の静止画（public/avatars に置いた画像を <img> で表示）
//  - sprite: スプライトシート（1枚を格子に分割し、状態でコマ切替）
// 実写を使う場合は public/avatars/ に画像を置き、下の image / sprite を追加・変更してください。

export type AvatarState = "idle" | "speaking" | "thinking";

export type AvatarDef =
  | {
      id: string;
      name: string;
      desc: string;
      kind: "svg";
      variant: "female" | "male" | "neutral";
    }
  | {
      id: string;
      name: string;
      desc: string;
      kind: "image";
      idle: string;
      speaking?: string;
      thinking?: string;
    }
  | {
      id: string;
      name: string;
      desc: string;
      kind: "sprite";
      sheet: string;
      cols: number;
      rows: number;
      idle: number; // セル番号（0始まり, 左上から右へ）
      speaking: number[]; // 発話時に巡回するコマ
      thinking: number;
    };

export const AVATARS: AvatarDef[] = [
  // ① 内蔵SVG（すぐ動く・表情アニメ）
  { id: "ai_f", name: "AI", desc: "女性・内蔵SVG", kind: "svg", variant: "female" },
  { id: "minato", name: "みなと", desc: "男性・内蔵SVG", kind: "svg", variant: "male" },
  { id: "asuka", name: "あすか", desc: "女性イラスト・内蔵SVG", kind: "svg", variant: "neutral" },
  // ② 1キャラ=1枚の静止画（public/avatars/mentor.svg）。実写画像に差し替え可。
  { id: "mentor", name: "メンター", desc: "静止画アバター", kind: "image", idle: "/avatars/mentor.svg" },
  // ③ スプライトシート（2×2 / public/avatars/sprite-4.svg）。状態でコマ切替。
  {
    id: "sprite",
    name: "スプライト",
    desc: "連番シート切替",
    kind: "sprite",
    sheet: "/avatars/sprite-4.svg",
    cols: 2,
    rows: 2,
    idle: 0,
    speaking: [1, 2],
    thinking: 3,
  },
  // ④ 実写写真アバター（女性/男性）。public/avatars/ の切り出し済みフレームを使用。
  //    発話中は idle と speaking を交互に表示して口パク風に見せる（avatar.tsx 側で処理）。
  {
    id: "real_f",
    name: "女性",
    desc: "実写・女性",
    kind: "image",
    idle: "/avatars/woman_idle.png",
    speaking: "/avatars/woman_talk.png",
    thinking: "/avatars/woman_think.png",
  },
  {
    id: "real_m",
    name: "男性",
    desc: "実写・男性",
    kind: "image",
    idle: "/avatars/man_idle.png",
    speaking: "/avatars/man_talk.png",
    thinking: "/avatars/man_think.png",
  },
];

export const DEFAULT_AVATAR = AVATARS[0];

export function findAvatar(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? DEFAULT_AVATAR;
}
