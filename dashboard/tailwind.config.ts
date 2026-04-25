import type { Config } from "tailwindcss";
import theme from "../packages/shared/src/theme.json";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: theme.colors.bg.default,
        surface: theme.colors.bg.surface,
        card: theme.colors.bg.card,
        primary: theme.colors.brand.primary,
        accent: theme.colors.brand.accent,
        success: theme.colors.status.success,
        danger: theme.colors.status.danger,
        border: theme.colors.border,
        "text-primary": theme.colors.text.primary,
        "text-secondary": theme.colors.text.secondary,
      },
      fontFamily: {
        sans: [theme.typography.fontFamily.sans],
        mono: [theme.typography.fontFamily.mono],
      },
      spacing: {
        ...theme.spacing,
      },
    },
  },
  plugins: [],
};
export default config;
