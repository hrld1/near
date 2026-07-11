// "Reparar": datos de las herramientas para cerrar bien una discusión.
// Base Gottman: los gestos de reparación (repair attempts) frenan la escalada;
// procesar la discusión en calma (aftermath) convierte una pelea en entendimiento.

// Gestos de reparación: frases suaves para tender la mano en caliente.
export const REPAIR_GESTURES = [
  "Lo siento.",
  "No quiero discutir contigo.",
  "¿Podemos empezar de nuevo?",
  "Te quiero, aunque esté enfadado/a.",
  "Necesito un abrazo.",
  "Tienes parte de razón.",
  "¿Podemos hablarlo con calma?",
  "Paremos un momento y respiremos."
] as const;

// Emociones para nombrar cómo te sentiste (sin culpar al otro).
export const REPAIR_FEELINGS = [
  "Dolido/a",
  "Enfadado/a",
  "No escuchado/a",
  "Triste",
  "Frustrado/a",
  "Con miedo",
  "Culpable",
  "Solo/a",
  "Incomprendido/a",
  "Agobiado/a"
] as const;
