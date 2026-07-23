// Transición de página (it39): un template se re-monta en cada navegación, así
// que su animación de entrada corre cada vez que cambias de pantalla. Un fundido
// con un pelín de subida hace que Near se sienta una app, no una web que
// recarga. Sutil (0.35s) y la regla global de reduced-motion lo desactiva.
// El layout (raíl, stream SSE, toasts) vive fuera y NO se re-monta.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
