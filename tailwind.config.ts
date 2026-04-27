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
    },
  },
  plugins: [],
};
export default config;
