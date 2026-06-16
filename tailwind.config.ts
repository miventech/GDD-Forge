import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        line: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        purple: {
          light: "var(--purple-light)",
          DEFAULT: "var(--purple-mid)",
          dark: "var(--purple-dark)",
        },
        teal: {
          light: "var(--teal-light)",
          DEFAULT: "var(--teal-mid)",
          dark: "var(--teal-dark)",
        },
        coral: {
          light: "var(--coral-light)",
          DEFAULT: "var(--coral-mid)",
          dark: "var(--coral-dark)",
        },
        amber: {
          light: "var(--amber-light)",
          DEFAULT: "var(--amber-mid)",
          dark: "var(--amber-dark)",
        },
        red: {
          light: "var(--red-light)",
          DEFAULT: "var(--red-mid)",
          dark: "var(--red-dark)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
