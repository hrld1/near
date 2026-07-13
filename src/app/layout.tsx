import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

// La voz tipográfica de Near (it27): Fraunces (serif cálida y expresiva,
// con el eje SOFT al máximo: curvas amables, nada de periódico) para los
// titulares, y Figtree (humanista, redonda, muy legible) para todo lo demás.
// next/font las sirve desde el propio servidor: sin peticiones a Google.
const sans = Figtree({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"]
});

export const metadata: Metadata = {
  title: { default: "Near", template: "%s · Near" },
  description: "Un hogar digital privado para parejas a distancia."
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF5EF" },
    { media: "(prefers-color-scheme: dark)", color: "#15111B" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("near-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`
          }}
        />
      </head>
      <body className="min-h-dvh">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
