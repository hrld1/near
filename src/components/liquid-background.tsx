// El fondo líquido de Near (it38): cuatro manchas de gradiente en el rosa→rojo
// de la marca que derivan por su cuenta detrás de toda la app. Todo el estilo y
// el movimiento vive en globals.css (.liquid-bg); aquí solo van los elementos.
// Sin estado ni JS: es puro CSS, así que es un Server Component.
export function LiquidBackground() {
  return (
    <div className="liquid-bg" aria-hidden="true">
      <span className="b1" />
      <span className="b2" />
      <span className="b3" />
      <span className="b4" />
    </div>
  );
}
