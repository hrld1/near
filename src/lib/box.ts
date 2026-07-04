// Contenido de la caja diaria: retos, preguntas picantes-suaves, gestos y
// flashbacks de vuestros propios momentos. Determinista una vez abierta
// (se persiste) para que ambos vean lo mismo.

export type BoxContent = { kind: "DARE" | "QUESTION" | "GESTURE" | "FLASHBACK"; text: string };

export const DARES = [
  "Enviaos ahora mismo la foto mas reciente de vuestra galeria. Sin filtrar.",
  "Nota de voz de 30 segundos imitando al otro. Sed valientes.",
  "Describid vuestro dia usando solo 5 emojis en el chat.",
  "Compartid la cancion que mas habeis escuchado esta semana.",
  "Foto de lo que estais viendo ahora mismo, tal cual.",
  "Escribid un piropo de exactamente 7 palabras.",
  "Contad un secreto tonto que nunca hayais dicho.",
  "Recread vuestra primera conversacion en 3 mensajes.",
  "Enviad la foto mas antigua que tengais del otro.",
  "Nota de voz cantando el estribillo de 'vuestra cancion'."
];

export const QUESTIONS = [
  "Si manana pudierais vivir en la misma ciudad, cual seria y por que?",
  "Que es lo que mas te costo de este mes a distancia?",
  "Cual fue el momento exacto de esta semana en que mas me echaste de menos?",
  "Que tradicion nueva quieres que inventemos?",
  "Que te da miedo preguntarme?",
  "Si tuvieramos un fin de semana sorpresa, que plan harias?",
  "Que cancion describiria nuestro proximo reencuentro?",
  "Que has aprendido de ti gracias a la distancia?"
];

export const GESTURES = [
  "Hoy toca: escribid una nota destacada nueva el uno para el otro.",
  "Programad ahora mismo vuestra proxima cita virtual en el calendario.",
  "Cada uno sube una foto al album de algo que le recuerde al otro.",
  "Cambiad vuestra pregunta del dia por una partida al reto diario, juntos.",
  "Dedicaos 10 minutos de videollamada sin movil en la otra mano.",
  "Escribid en el chat 3 cosas del otro por las que hoy dais las gracias."
];

export function pickBox(seed: number, flashbackText: string | null): BoxContent {
  const pools: BoxContent["kind"][] = flashbackText
    ? ["DARE", "QUESTION", "GESTURE", "FLASHBACK"]
    : ["DARE", "QUESTION", "GESTURE"];
  const kind = pools[seed % pools.length];
  if (kind === "FLASHBACK" && flashbackText) {
    return { kind, text: flashbackText };
  }
  if (kind === "QUESTION") return { kind, text: QUESTIONS[seed % QUESTIONS.length] };
  if (kind === "GESTURE") return { kind, text: GESTURES[seed % GESTURES.length] };
  return { kind: "DARE", text: DARES[seed % DARES.length] };
}
