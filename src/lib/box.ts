// Contenido de la caja diaria: retos, preguntas picantes-suaves, gestos y
// flashbacks de vuestros propios momentos. Determinista una vez abierta
// (se persiste) para que ambos vean lo mismo.

export type BoxContent = { kind: "DARE" | "QUESTION" | "GESTURE" | "FLASHBACK"; text: string };

export const DARES = [
  "Enviaos ahora mismo la foto mas reciente de vuestra galeria. Sin filtrar.",
  "Nota de voz de 30 segundos imitando al otro. Sed valientes.",
  "Describid vuestro día usando solo 5 emojis en el chat.",
  "Compartid la canción que mas habeis escuchado esta semana.",
  "Foto de lo que estáis viendo ahora mismo, tal cual.",
  "Escribid un piropo de exactamente 7 palabras.",
  "Contad un secreto tonto que nunca hayais dicho.",
  "Recread vuestra primera conversacion en 3 mensajes.",
  "Enviad la foto mas antigua que tengais del otro.",
  "Nota de voz cantando el estribillo de 'vuestra canción'.",
  "Escribid al otro usando solo preguntas durante 10 minutos.",
  "Foto de vuestro rincon favorito de casa, con explicacion de por que.",
  "Nota de voz contando un chiste malo. Cuanto peor, mejor.",
  "Enviad un mensaje como si fuerais desconocidos ligando por primera vez.",
  "Dibujad al otro en 60 segundos (vale papel o pantalla) y enviad la foto.",
  "Escribid 3 cosas que hariais si estuvierais juntos AHORA mismo.",
  "Foto del cielo desde donde estáis, ahora.",
  "Nota de voz describiendo al otro en 20 segundos, sin decir su nombre.",
  "Buscad un GIF que resuma vuestra relacion y enviadlo sin contexto.",
  "Escribid el titular de periodico de vuestro día de hoy.",
  "Nota de voz susurrando lo primero que pensasteis al despertar.",
  "Enviad una foto de algo que os haya recordado al otro esta semana.",
  "Jugad al reto diario de la arcade ahora y comentad el resultado en el chat.",
  "Escribid vuestro plan perfecto para el próximo reencuentro en 4 pasos.",
  "Mandad la última canción que os hizo pensar en el otro."
];

export const QUESTIONS = [
  "Si mañana pudierais vivir en la misma ciudad, cual seria y por que?",
  "Que es lo que mas te costo de este mes a distancia?",
  "Cual fue el momento exacto de esta semana en que mas me echaste de menos?",
  "Que tradicion nueva quieres que inventemos?",
  "Que te da miedo preguntarme?",
  "Si tuvieramos un fin de semana sorpresa, que plan harias?",
  "Que canción describiria nuestro próximo reencuentro?",
  "Que has aprendido de ti gracias a la distancia?",
  "Que detalle pequeño mío crees que nadie mas nota?",
  "Cual es tu recuerdo favorito de nosotros que nunca hemos hablado?",
  "Que te gustaria que hicieramos mas a menudo, aunque sea a distancia?",
  "Si pudieras congelar un momento nuestro para siempre, cual seria?",
  "Que parte de vivir juntos te hace mas ilusion? Y cual mas respeto?",
  "Que cosa mía te saco de quicio esta semana? (con carino)",
  "Cual fue la última vez que te rei solo/a recordando algo nuestro?",
  "Que le dirias a la version de ti de justo antes de conocernos?",
  "Que apodo secreto me pondrias hoy y por que?",
  "Si nuestra relacion tuviera banda sonora esta semana, que canción seria?",
  "Que quieres que celebremos cuando volvamos a vernos?",
  "Que pregunta te gustaria que YO te hiciera mas veces?"
];

export const GESTURES = [
  "Hoy toca: escribid una nota destacada nueva el uno para el otro.",
  "Programad ahora mismo vuestra próxima cita virtual en el calendario.",
  "Cada uno sube una foto al album de algo que le recuerde al otro.",
  "Cambiad vuestra pregunta del día por una partida al reto diario, juntos.",
  "Dedicaos 10 minutos de videollamada sin movil en la otra mano.",
  "Escribid en el chat 3 cosas del otro por las que hoy dais las gracias.",
  "Enviad un 'pensando en ti' en el momento mas inesperado del día.",
  "Guardad en el album un momento de HOY, aunque parezca poca cosa.",
  "Elegid juntos el video de la sala para esta noche.",
  "Poneos vuestro mood check con nota... y que la nota sea para el otro.",
  "Revisad el album 5 minutos juntos por videollamada y elegid favorita.",
  "Escribid al despertar mañana el primer mensaje antes de mirar nada mas.",
  "Retad al otro a superar vuestra marca en el juego que peor se os da.",
  "Contadle al otro un plan concreto para el finde del reencuentro.",
  "Hoy, última nota de voz del día en vez de último texto."
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
