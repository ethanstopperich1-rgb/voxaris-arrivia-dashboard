import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        voxaris: {
          cyan: "#22d3ee",
          ink: "#0a0a0a",
        },
      },
      animation: {
        "border-beam":
          "border-beam calc(var(--duration)*1s) infinite linear",
        // Square-perimeter orbit — the dot rides ON the card edge,
        // never inside the content area, so it never cuts through text.
        "orbit-dot": "orbit-dot 8s linear infinite",
      },
      keyframes: {
        "border-beam": {
          "100%": { "offset-distance": "100%" },
        },
        "orbit-dot": {
          "0%, 100%":  { top: "-4px",                    left: "-4px" },
          "25%":       { top: "-4px",                    left: "calc(100% - 4px)" },
          "50%":       { top: "calc(100% - 4px)",        left: "calc(100% - 4px)" },
          "75%":       { top: "calc(100% - 4px)",        left: "-4px" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
