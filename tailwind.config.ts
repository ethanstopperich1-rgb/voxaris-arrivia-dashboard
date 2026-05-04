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
        // Orbiting-dot ring for the "Live Calls" glow card.
        "orbit-dot": "orbit-dot 6s linear infinite",
      },
      keyframes: {
        "border-beam": {
          "100%": { "offset-distance": "100%" },
        },
        "orbit-dot": {
          "0%, 100%": { top: "10%", right: "10%" },
          "25%": { top: "10%", right: "calc(100% - 35px)" },
          "50%": { top: "calc(100% - 30px)", right: "calc(100% - 35px)" },
          "75%": { top: "calc(100% - 30px)", right: "10%" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
