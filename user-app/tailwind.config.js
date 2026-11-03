/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EEF3F8",
          100: "#D8E3EE",
          200: "#B4C7DB",
          300: "#8AA8C4",
          400: "#5F86A9",
          500: "#3D6A92",
          600: "#2A5277",
          700: "#163E5F",
          800: "#0F2F4A",
          900: "#0A2236",
        },
        gold: {
          50: "#FBF6EC",
          100: "#F4E8CE",
          200: "#EAD3A2",
          300: "#DEBB72",
          400: "#D2A54C",
          500: "#C08A2E",
          600: "#A67424",
          700: "#855A1C",
          800: "#684616",
          900: "#523711",
        },
        success: "#0E7C5A",
        danger: "#B42318",
        warning: "#B54708",
        surface: "#F6F7F9",
        paper: "#FBFAF7",
        sand: "#F7F4ED",
        card: "#FFFFFF",
        border: "#E4E8EE",
        line: "#DCE2EA",
        heading: "#0B1B2B",
        body: "#475467",
        muted: "#667085",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Instrument Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      maxWidth: {
        container: "1240px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(11 27 43 / 0.04)",
        sm: "0 1px 2px 0 rgb(11 27 43 / 0.05), 0 1px 3px 0 rgb(11 27 43 / 0.04)",
        md: "0 6px 16px -6px rgb(11 27 43 / 0.12), 0 2px 4px -2px rgb(11 27 43 / 0.06)",
        lg: "0 18px 40px -18px rgb(11 27 43 / 0.22), 0 4px 10px -6px rgb(11 27 43 / 0.08)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flash-fast": "pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
