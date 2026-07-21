"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

// Estado de cliente sembrado desde el servidor, que se deja corregir cuando el
// servidor cambia de opinión (it32).
//
// El problema que resuelve: media app está construida sobre `useState(initial)`
// con `initial` viniendo de un componente de servidor. React solo usa ese valor
// en el PRIMER montaje — después ignora la prop. Funciona mientras los cambios
// lleguen por el bus de eventos, pero en cuanto te desconectas y vuelves, el
// bus no tiene historial: `router.refresh()` trae los datos buenos del servidor
// y el componente los descarta sin mirarlos. Lo cazó el spec de reconexión, que
// veía el cartel desaparecer y la pantalla seguir sin el aprecio que se había
// perdido.
//
// La firma se compara por valor, no por identidad: cada render del servidor
// crea objetos nuevos, así que comparar referencias resetearía en bucle. Los
// datos sembrados aquí son pequeños (una lista de aprecios, una caja, un ánimo)
// y esto ocurre en cada render, así que si algún día crece hay que revisarlo.
//
// Es la sincronización durante el render que documenta React ("adjusting state
// when props change"): sin useEffect y sin renderizar una vez con datos viejos.
export function useServerState<T>(initial: T): [T, Dispatch<SetStateAction<T>>] {
  const signature = JSON.stringify(initial) ?? "";
  const [value, setValue] = useState<T>(initial);
  const [seen, setSeen] = useState(signature);

  if (seen !== signature) {
    setSeen(signature);
    setValue(initial);
  }

  return [value, setValue];
}
