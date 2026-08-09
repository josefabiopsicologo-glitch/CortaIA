import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tema "Dark Professional" — ver docs/ARCHITECTURE.md (Design).
        background: "#0D0F12",
        panel: "#15181E",
        elevated: "#1B1F27",
        border: "#292E38",
        foreground: "#F5F7FA",
        muted: "#9CA3AF",
        accent: {
          DEFAULT: "#14A0C0",
          hover: "#1AB4D6",
          muted: "#0E7A94",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
