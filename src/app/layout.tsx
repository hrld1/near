import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Near", template: "%s · Near" },
  description: "Un hogar digital privado para parejas a distancia."
};

export const viewport: Viewport = {
  themeColor: "#FAF6F0"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("near-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`
          }}
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
