// El fondo de Near (it44): un gradiente estático en el rosa→rojo de la marca,
// pintado una sola vez detrás de toda la app. Todo el color vive en globals.css
// (.liquid-bg); antes esto tenía cuatro manchas animadas con desenfoque que
// iban lentas — ahora es una sola capa sin animación ni filtro. Server Component.
export function LiquidBackground() {
  return <div className="liquid-bg" aria-hidden="true" />;
}
