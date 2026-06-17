import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple × Notion × Linear — 落ち着いた中立色 + 1アクセント
        ink: {
          DEFAULT: "#1c1c1e",
          soft: "#3a3a3c",
          muted: "#8e8e93",
        },
        surface: {
          DEFAULT: "#ffffff",
          sunken: "#f7f7f8",
          raised: "#fbfbfc",
        },
        line: "#e7e7ea",
        accent: {
          DEFAULT: "#5b5bd6",
          soft: "#eeeefb",
        },
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Hiragino Kaku Gothic ProN",
          "Noto Sans JP",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
