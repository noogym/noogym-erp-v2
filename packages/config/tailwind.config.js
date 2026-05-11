/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        noogym: {
          bg: "#050708",
          panel: "#080C0E",
          panel2: "#0C1113",
          line: "#1C2529",
          lime: "#B6FF00",
          lime2: "#9DD600",
          muted: "#9AA3A7"
        }
      },
      boxShadow: {
        soft: "0 20px 70px rgba(0,0,0,.35)",
        glow: "0 0 28px rgba(182,255,0,.16)"
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};
