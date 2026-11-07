/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Brand ink and saleroom navy, shared with the public app. */
        navy: {
          50: "#EEF2F6",
          100: "#D7E0EA",
          200: "#B3C4D4",
          300: "#8CA6BC",
          400: "#6488A4",
          500: "#446C8C",
          600: "#2E5674",
          700: "#163E5F",
          800: "#102F49",
          900: "#0B1B2B",
        },
        gold: {
          50: "#FBF4E6",
          100: "#F4E3C2",
          200: "#EACF97",
          300: "#DEB968",
          400: "#D2A343",
          500: "#C08A2E",
          600: "#A87423",
          700: "#8A5D1C",
          800: "#6B4716",
          900: "#4E3411",
        },
        /* Administrative surface: paper, stone, ink, patina and laterite. */
        ink: "#101E2B",
        paper: "#F4F5F2",
        stone: "#DDE2DC",
        sand: "#EFE7D6",
        verdigris: "#3F6B5E",
        laterite: "#9A4B33",
        success: "#3F6B5E",
        danger: "#9A4B33",
        warning: "#A87423",
        surface: "#F4F5F2",
        card: "#FCFCFA",
        border: "#DDE2DC",
        heading: "#101E2B",
        body: "#44535B",
        muted: "#78868C",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(16 30 43 / 0.04)",
        md: "0 6px 18px -8px rgb(16 30 43 / 0.18)",
        lg: "0 18px 40px -24px rgb(16 30 43 / 0.28)",
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
