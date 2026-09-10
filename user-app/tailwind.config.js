/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#E8EDF5",
          100: "#C5D1E8",
          200: "#9DB3D8",
          300: "#7595C8",
          400: "#577FBC",
          500: "#3A69B0",
          600: "#2D5499",
          700: "#1B3A6B",
          800: "#152D52",
          900: "#0F203A",
        },
        gold: {
          50: "#FDF6E8",
          100: "#FAE8BF",
          200: "#F6D894",
          300: "#F1C768",
          400: "#EDBB47",
          500: "#E8A020",
          600: "#D4901B",
          700: "#B97A15",
          800: "#9E640F",
          900: "#7A4E0C",
        },
        success: "#16A34A",
        danger: "#DC2626",
        warning: "#F59E0B",
        surface: "#F8F9FC",
        card: "#FFFFFF",
        border: "#E2E8F0",
        heading: "#0F172A",
        body: "#475569",
        muted: "#94A3B8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flash-fast": "pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      gridTemplateColumns: {
        12: "repeat(12, minmax(0, 1fr))",
      },
    },
  },
  plugins: [],
};
