// Transición de página (it39): un template se re-monta en cada navegación, así
// que su animación de entrada corre cada vez que cambias de pantalla. Un fundido
// hace que Near se sienta una app, no una web que recarga. Sutil (0.3s) y la
// regla global de reduced-motion lo desactiva. El layout (raíl, stream SSE,
// toasts) vive fuera y NO se re-monta.
//
// IMPORTANTE: SOLO opacidad, nunca transform. Un transform en este wrapper
// establecería un bloque contenedor y los overlays `position:fixed` de las
// páginas (la constelación, modales, la llamada) se posicionarían respecto a
// él en vez de al viewport, rompiéndose.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
