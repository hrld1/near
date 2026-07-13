import type { Config } from "tailwindcss";

// Toda la paleta vive en variables CSS (globals.css): dark mode = cambiar
// variables, sin tocar componentes.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cream: v("c-cream"),
        paper: v("c-paper"),
        sand: v("c-sand"),
        "sand-deep": v("c-sand-deep"),
        ink: v("c-ink"),
        "ink-soft": v("c-ink-soft"),
        rose: {
          DEFAULT: v("c-rose"),
          deep: v("c-rose-deep"),
          soft: v("c-rose-soft"),
          faint: v("c-rose-faint")
        },
        plum: v("c-plum")
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      boxShadow: {
        // capas suaves con tinte cálido (el --c-shadow ya no es gris)
        card: "0 1px 2px rgb(var(--c-shadow) / 0.05), 0 4px 14px rgb(var(--c-shadow) / 0.06), 0 12px 32px rgb(var(--c-shadow) / 0.04)",
        lift: "0 2px 4px rgb(var(--c-shadow) / 0.07), 0 10px 24px rgb(var(--c-shadow) / 0.10), 0 24px 56px rgb(var(--c-shadow) / 0.07)",
        // el resplandor de lo importante (botón primario, activo del nav)
        glow: "0 2px 8px rgb(var(--c-rose) / 0.35), 0 8px 28px rgb(var(--c-rose) / 0.28)"
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-heart": {
          "0%, 100%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.25)" }
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.85)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" }
        },
        confetti: {
          "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(90px) rotate(360deg)", opacity: "0" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "pulse-heart": "pulse-heart 0.6s ease-in-out",
        "pop-in": "pop-in 0.25s ease-out both",
        shake: "shake 0.3s ease-in-out",
        confetti: "confetti 1.1s ease-in forwards"
      }
    }
  },
  plugins: []
};

export default config;
