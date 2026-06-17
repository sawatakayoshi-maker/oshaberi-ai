import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "パーソナル ブレイン (Personal Brain)",
  description: "あなた専用の第二の脳 — メモ・タスク・アイデア・知識・お話の統合管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
