// Duelo de ingenio (it52): a diferencia de los mazos de "conoceros" (respuesta
// abierta, recíproca), esto es un juego COMPETITIVO con respuesta CORRECTA.
// Cada uno responde por su cuenta (asíncrono, cómodo para la distancia) y el
// marcador dice quién acierta más, tú o tu pareja. Preguntas entretenidas, de
// pensar, acertijos y curiosidades — nada empalagoso. El contenido vive aquí
// como datos (igual que decks/journeys); la BD solo guarda la elección de cada
// persona por pregunta (TriviaAnswer). Orden FIJO y `correct` en posiciones
// variadas: los dos ven lo mismo (duelo justo) y no se cuela por costumbre.

export type TriviaCategory = "acertijo" | "logica" | "curiosidad" | "cultura";

export type TriviaQuestion = {
  id: string; // estable
  category: TriviaCategory;
  question: string;
  options: string[];
  correct: number; // índice de la opción correcta
  explain?: string; // se muestra tras responder
};

export const TRIVIA_CATEGORIES: Record<TriviaCategory, { name: string }> = {
  acertijo: { name: "Acertijo" },
  logica: { name: "Lógica" },
  curiosidad: { name: "Curiosidad" },
  cultura: { name: "Cultura" }
};

export const TRIVIA: TriviaQuestion[] = [
  {
    id: "ac1",
    category: "acertijo",
    question: "Cuanto más le quitas, más grande se hace. ¿Qué es?",
    options: ["Una montaña", "Un agujero", "Una deuda", "Una sombra"],
    correct: 1,
    explain: "Cuanto más cavas, más grande es el agujero."
  },
  {
    id: "ac2",
    category: "acertijo",
    question: "Tengo agujas pero no sé coser; tengo números pero no sé leer. ¿Qué soy?",
    options: ["Una brújula", "Una regla", "Un reloj", "Un calendario"],
    correct: 2
  },
  {
    id: "ac3",
    category: "acertijo",
    question: "Blanca por dentro, verde por fuera. Si quieres que te lo diga, espera.",
    options: ["La manzana", "El aguacate", "El kiwi", "La pera"],
    correct: 3,
    explain: "“Es-pera”: la propia adivinanza lo dice."
  },
  {
    id: "ac4",
    category: "acertijo",
    question: "¿Qué es lo que se moja justo mientras seca?",
    options: ["La toalla", "La esponja", "El sol", "El viento"],
    correct: 0
  },
  {
    id: "ac5",
    category: "acertijo",
    question: "Vuela sin alas, silba sin boca, y no se ve ni se toca. ¿Qué es?",
    options: ["El humo", "El viento", "El eco", "La niebla"],
    correct: 1
  },
  {
    id: "lo1",
    category: "logica",
    question: "En una carrera adelantas al que va segundo. ¿En qué puesto quedas?",
    options: ["Primero", "Segundo", "Tercero", "Depende"],
    correct: 1,
    explain: "Ocupas el puesto del que adelantaste: el segundo."
  },
  {
    id: "lo2",
    category: "logica",
    question: "Un tren eléctrico avanza hacia el norte. ¿Hacia dónde va el humo?",
    options: ["Al sur", "Al norte", "No echa humo", "Depende del viento"],
    correct: 2,
    explain: "Es eléctrico: no hay humo."
  },
  {
    id: "lo3",
    category: "logica",
    question: "Hay 3 manzanas en la mesa y te llevas 2. ¿Cuántas tienes tú?",
    options: ["1", "2", "3", "5"],
    correct: 1,
    explain: "Tienes las 2 que te llevaste."
  },
  {
    id: "lo4",
    category: "logica",
    question: "Un caracol sube 3 m de día y resbala 2 de noche en un pozo de 5 m. ¿Qué día sale?",
    options: ["El día 2", "El día 3", "El día 5", "Nunca sale"],
    correct: 1,
    explain: "Día 1 acaba en 1 m, día 2 en 2 m, y el día 3 sube a 5 m y sale antes de resbalar."
  },
  {
    id: "lo5",
    category: "logica",
    question: "¿Cuántos meses del año tienen 28 días?",
    options: ["Solo febrero", "Los 12", "Ninguno", "Seis"],
    correct: 1,
    explain: "Todos los meses tienen al menos 28 días."
  },
  {
    id: "lo6",
    category: "logica",
    question: "¿Qué pesa más, un kilo de plumas o un kilo de plomo?",
    options: ["El plomo", "Las plumas", "Pesan igual", "Depende"],
    correct: 2
  },
  {
    id: "cu1",
    category: "curiosidad",
    question: "¿Cuántos corazones tiene un pulpo?",
    options: ["Uno", "Dos", "Tres", "Cinco"],
    correct: 2,
    explain: "Dos bombean sangre a las branquias y uno al resto del cuerpo."
  },
  {
    id: "cu2",
    category: "curiosidad",
    question: "¿Qué país tiene más husos horarios del mundo?",
    options: ["Francia", "Rusia", "Estados Unidos", "China"],
    correct: 0,
    explain: "Francia suma 12 gracias a sus territorios de ultramar."
  },
  {
    id: "cu3",
    category: "curiosidad",
    question: "¿Qué órgano humano puede regenerarse casi por completo?",
    options: ["El corazón", "El hígado", "El cerebro", "Los pulmones"],
    correct: 1
  },
  {
    id: "cu4",
    category: "curiosidad",
    question: "¿Cuál de estos animales puede pasar más tiempo sin beber agua?",
    options: ["El camello", "La rata canguro", "El elefante", "La jirafa"],
    correct: 1,
    explain: "La rata canguro obtiene el agua de las semillas que come; casi nunca bebe."
  },
  {
    id: "cu5",
    category: "curiosidad",
    question: "¿Cuánto tarda la luz del Sol en llegar a la Tierra?",
    options: ["Un segundo", "Unos 8 minutos", "Una hora", "Instantáneo"],
    correct: 1
  },
  {
    id: "cu6",
    category: "curiosidad",
    question: "¿Qué se inventó antes?",
    options: ["El encendedor", "La cerilla"],
    correct: 0,
    explain: "El encendedor (1823) es anterior a la cerilla de fricción (1826)."
  },
  {
    id: "cu7",
    category: "curiosidad",
    question: "La miel, bien conservada, ¿puede echarse a perder?",
    options: ["Sí, en meses", "Prácticamente nunca", "Sí, en un año", "Solo si es líquida"],
    correct: 1,
    explain: "Se han comido mieles de miles de años de antigüedad."
  },
  {
    id: "ct1",
    category: "cultura",
    question: "¿Cuál de estos ya NO se considera un planeta?",
    options: ["Neptuno", "Plutón", "Mercurio", "Venus"],
    correct: 1,
    explain: "Desde 2006 Plutón es un “planeta enano”."
  },
  {
    id: "ct2",
    category: "cultura",
    question: "¿Qué planeta gira casi tumbado, rodando por su órbita?",
    options: ["Marte", "Saturno", "Urano", "Júpiter"],
    correct: 2,
    explain: "Urano tiene el eje inclinado casi 98°."
  },
  {
    id: "ct3",
    category: "cultura",
    question: "En “Romeo y Julieta”, ¿a qué familia pertenece Romeo?",
    options: ["Montesco", "Capuleto", "Médici", "Borgia"],
    correct: 0
  },
  {
    id: "ct4",
    category: "cultura",
    question: "¿Qué metal es líquido a temperatura ambiente?",
    options: ["El plomo", "El mercurio", "El estaño", "El aluminio"],
    correct: 1
  },
  {
    id: "ct5",
    category: "cultura",
    question: "¿Cuántos lados tiene un icoságono?",
    options: ["12", "16", "20", "24"],
    correct: 2,
    explain: "“Icosa-” es veinte, como en icosaedro."
  },
  {
    id: "ct6",
    category: "cultura",
    question: "¿Cuál es el océano más grande de la Tierra?",
    options: ["Atlántico", "Índico", "Ártico", "Pacífico"],
    correct: 3
  }
];

export function triviaById(id: string): TriviaQuestion | null {
  return TRIVIA.find((q) => q.id === id) ?? null;
}
