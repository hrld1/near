import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre necesita al menos 2 caracteres").max(50),
  email: z.string().trim().toLowerCase().email("Email no valido"),
  password: z.string().min(8, "La contrasena necesita al menos 8 caracteres").max(100)
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no valido"),
  password: z.string().min(1, "Escribe tu contrasena")
});

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^NEAR-[A-Z0-9]{6}$/, "El codigo tiene el formato NEAR-XXXXXX")
});

export const messageSchema = z
  .object({
    channel: z.enum(["MAIN", "DATE_ROOM"]).default("MAIN"),
    kind: z.enum(["TEXT", "IMAGE", "VOICE"]).default("TEXT"),
    body: z.string().trim().max(4000).optional(),
    attachmentUrl: z.string().startsWith("/api/files/").optional(),
    durationSeconds: z.number().int().min(0).max(600).optional()
  })
  .refine((m) => (m.kind === "TEXT" ? !!m.body && m.body.length > 0 : !!m.attachmentUrl), {
    message: "Mensaje vacio"
  });

export const moodSchema = z.object({
  mood: z.string().trim().min(1).max(30),
  note: z.string().trim().max(200).optional()
});

export const noteSchema = z.object({
  body: z.string().trim().min(1, "Escribe algo").max(280, "Maximo 280 caracteres")
});

export const promptAnswerSchema = z.object({
  promptId: z.coerce.number().int().positive(),
  answer: z.string().trim().min(1, "Escribe una respuesta").max(500)
});

export const momentSchema = z
  .object({
    kind: z.enum(["PHOTO", "NOTE", "MEMORY"]),
    title: z.string().trim().max(100).optional(),
    body: z.string().trim().max(2000).optional(),
    imageUrl: z.string().startsWith("/api/files/").optional(),
    happenedAt: z.string().optional(),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(24)).max(5).optional()
  })
  .refine((m) => (m.kind === "PHOTO" ? !!m.imageUrl : !!m.body), {
    message: "Anade una foto o un texto"
  });

export const eventSchema = z.object({
  title: z.string().trim().min(2, "Ponle un titulo").max(100),
  description: z.string().trim().max(500).optional(),
  kind: z.enum(["DATE", "VISIT", "ANNIVERSARY", "OTHER"]),
  startsAt: z.string().min(1, "Elige fecha y hora"),
  endsAt: z.string().optional(),
  showCountdown: z.boolean().default(true)
});

export const playbackSchema = z.object({
  playing: z.boolean(),
  positionSec: z.number().min(0).max(60 * 60 * 12)
});

export const quizAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  selfIndex: z.number().int().min(0).max(3),
  guessIndex: z.number().int().min(0).max(3)
});
