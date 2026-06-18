"use client";

import { useEffect, useState } from "react";
import type { AvatarDef, AvatarState } from "@/lib/avatars";

/**
 * アバター表示。状態（idle / speaking / thinking）で表情・コマを切り替える。
 * svg / image / sprite の3方式に対応。
 */
export function AvatarView({
  avatar,
  state,
  size = 64,
}: {
  avatar: AvatarDef;
  state: AvatarState;
  size?: number;
}) {
  // 発話中はコマ（口）をアニメーション
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (state !== "speaking") {
      setFrame(0);
      return;
    }
    const t = setInterval(() => setFrame((f) => f + 1), 180);
    return () => clearInterval(t);
  }, [state]);

  if (avatar.kind === "image") {
    // 発話中は idle と speaking を交互に表示して口パク風に。考え中は thinking。
    let src = avatar.idle;
    if (state === "speaking") {
      src = frame % 2 === 1 && avatar.speaking ? avatar.speaking : avatar.idle;
    } else if (state === "thinking" && avatar.thinking) {
      src = avatar.thinking;
    }
    return (
      // 小さなアバター画像のため next/image ではなく <img> を使用
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={avatar.name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  }

  if (avatar.kind === "sprite") {
    const cell =
      state === "speaking"
        ? avatar.speaking[frame % avatar.speaking.length]
        : state === "thinking"
          ? avatar.thinking
          : avatar.idle;
    const col = cell % avatar.cols;
    const row = Math.floor(cell / avatar.cols);
    const x = avatar.cols > 1 ? (col / (avatar.cols - 1)) * 100 : 0;
    const y = avatar.rows > 1 ? (row / (avatar.rows - 1)) * 100 : 0;
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${avatar.sheet})`,
          backgroundSize: `${avatar.cols * 100}% ${avatar.rows * 100}%`,
          backgroundPosition: `${x}% ${y}%`,
        }}
        className="rounded-full bg-surface-sunken"
        aria-label={avatar.name}
      />
    );
  }

  // svg（内蔵・表情アニメ）
  const mouthOpen = state === "speaking" && frame % 2 === 1;
  return <FaceSVG variant={avatar.variant} state={state} mouthOpen={mouthOpen} size={size} />;
}

function FaceSVG({
  variant,
  state,
  mouthOpen,
  size,
}: {
  variant: "female" | "male" | "neutral";
  state: AvatarState;
  mouthOpen: boolean;
  size: number;
}) {
  const hair = variant === "male" ? "#1c1c1e" : variant === "neutral" ? "#3a2a22" : "#5b3a29";
  const skin = "#f5d9c4";
  const eyeY = state === "thinking" ? 40 : 44; // 考え中は少し上を見る

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="48" fill="#eef0f6" />
      {/* 顔 */}
      <circle cx="50" cy="52" r="26" fill={skin} />
      {/* 髪 */}
      {variant === "female" && (
        <>
          <path d="M22 50 Q24 18 50 18 Q76 18 78 50 Q72 36 50 34 Q28 36 22 50 Z" fill={hair} />
          <path d="M22 50 Q20 70 26 80 L30 80 Q26 64 28 50 Z" fill={hair} />
          <path d="M78 50 Q80 70 74 80 L70 80 Q74 64 72 50 Z" fill={hair} />
        </>
      )}
      {variant === "male" && (
        <path d="M26 44 Q28 24 50 24 Q72 24 74 44 Q66 34 50 34 Q34 34 26 44 Z" fill={hair} />
      )}
      {variant === "neutral" && (
        <path d="M24 48 Q26 20 50 20 Q74 20 76 48 Q70 34 50 32 Q30 34 24 48 Z" fill={hair} />
      )}
      {/* 目 */}
      <circle cx="40" cy={eyeY} r="2.6" fill="#2a2a2e" />
      <circle cx="60" cy={eyeY} r="2.6" fill="#2a2a2e" />
      {/* 眉（考え中は寄せる） */}
      {state === "thinking" && (
        <>
          <line x1="35" y1="37" x2="45" y2="35" stroke="#7a6a60" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="55" y1="35" x2="65" y2="37" stroke="#7a6a60" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {/* 口 */}
      {mouthOpen ? (
        <ellipse cx="50" cy="62" rx="5" ry="4" fill="#b5524a" />
      ) : state === "thinking" ? (
        <line x1="46" y1="62" x2="52" y2="61" stroke="#b5524a" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M44 61 Q50 65 56 61" stroke="#b5524a" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      {/* 考え中の「…」 */}
      {state === "thinking" && (
        <g fill="#8e8e93">
          <circle cx="78" cy="30" r="1.8" />
          <circle cx="84" cy="26" r="1.4" />
          <circle cx="88" cy="22" r="1.1" />
        </g>
      )}
    </svg>
  );
}
