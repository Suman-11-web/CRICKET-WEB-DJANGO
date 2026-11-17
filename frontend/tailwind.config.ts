import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        turf: {
          950: "#04160E",
          900: "#072216",
          800: "#0B3B24",
          700: "#115736",
          600: "#177348",
          500: "#10B981",
        },
        gold: {
          600: "#B58E24",
          500: "#D4AF37",
          400: "#E8C85B",
          300: "#F4DF8F",
        },
        charcoal: {
          950: "#090D11",
          900: "#111820",
          800: "#1B2430",
        },
      },
    },
  },
  plugins: [],
};

export default config;
