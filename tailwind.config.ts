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
      // ESCALA TIPOGRÁFICA (it36). Antes no había ninguna: Tailwind por defecto
      // y 74 tamaños arbitrarios sueltos (hasta text-[8px]). Sin escala que
      // respetar, cada componente se afinaba a ojo. Tres registros con papeles
      // distintos, y el interlineado va emparejado a cada paso para no tener
      // que recordarlo en cada sitio.
      //
      // Los pasos de cromo conservan EXACTAMENTE el interlineado por defecto de
      // Tailwind: son 550 usos y mover su altura de línea desplazaría media
      // app. Los pasos nuevos (read/prose) sí nacen con aire, porque cargan
      // texto largo. Un `leading-*` o `tracking-*` explícito sigue ganando:
      // esos plugins se emiten después que fontSize.
      fontSize: {
        // — Cromo de interfaz: etiquetas, metadatos, sellos —
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.005em" }], // 11px
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],

        // — Lo que escriben las dos personas (el producto, no el marco) —
        read: ["0.9375rem", { lineHeight: "1.6" }], // 15px · conversación: chat, respuestas
        prose: ["1.0625rem", { lineHeight: "1.75" }], // 17px · escritura larga: cartas

        // — Interfaz y titulares —
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.015em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        "5xl": ["3rem", { lineHeight: "1", letterSpacing: "-0.025em" }],
        "6xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.03em" }]
      },
      // Ritmo vertical con nombre: hoy conviven 12 valores de margen distintos
      // porque no había ninguno canónico. Aditivo — no rompe las clases que ya
      // existen; da a dónde converger.
      spacing: {
        block: "1.25rem", // entre tarjetas hermanas
        section: "2.5rem", // entre secciones de una página
        gutter: "1.5rem" // margen lateral del contenido
      },
      // Tres papeles en vez de cinco radios sueltos. Los valores coinciden con
      // los que ya se usan (card = el rounded-3xl de Card, inset = rounded-2xl),
      // así que migrar a ellos no cambia nada de sitio.
      borderRadius: {
        pill: "9999px",
        card: "1.5rem",
        inset: "1rem"
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
        // latido suave y periódico del logo (it39): dos golpes discretos al
        // final de cada ciclo, como un corazón en calma. Nada intrusivo.
        heartbeat: {
          "0%, 82%, 100%": { transform: "scale(1)" },
          "88%": { transform: "scale(1.13)" },
          "94%": { transform: "scale(1.05)" }
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
        heartbeat: "heartbeat 3.6s ease-in-out infinite",
        "pop-in": "pop-in 0.25s ease-out both",
        shake: "shake 0.3s ease-in-out",
        confetti: "confetti 1.1s ease-in forwards"
      }
    }
  },
  plugins: []
};

export default config;
