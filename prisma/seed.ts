import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PROMPTS = [
  "Que es lo primero que haremos la proxima vez que nos veamos?",
  "Que cancion te recuerda a nosotros ultimamente?",
  "Que pequena cosa hizo tu dia mejor hoy?",
  "Si pudieramos teletransportarnos ahora mismo, a donde iriamos?",
  "Que plato quieres que cocinemos juntos algun dia?",
  "Cual es tu recuerdo favorito de nosotros este ano?",
  "Que te gustaria que hicieramos en nuestra proxima videollamada?",
  "Que aprendiste hoy que quieras contarme?",
  "Si nuestra relacion fuera una pelicula, cual seria?",
  "Que es algo que admiras de mi y nunca me has dicho?",
  "Cual seria tu domingo perfecto conmigo?",
  "Que lugar del mundo quieres que visitemos juntos?",
  "Que te hizo reir hoy?",
  "Que costumbre mia echas mas de menos?",
  "Si pudieras mandarme un objeto ahora mismo, cual seria?",
  "Que serie deberiamos empezar a ver juntos?",
  "Cual fue el momento exacto en que supiste que esto iba en serio?",
  "Que te gustaria aprender a hacer conmigo?",
  "Que detalle pequeno te enamora de nuestros dias normales?",
  "Como imaginas un martes cualquiera cuando vivamos juntos?",
  "Que cancion pondrias ahora mismo si estuvieramos abrazados?",
  "Que es lo mas raro que has hecho esta semana?",
  "Que sueno tuviste hace poco que quieras contarme?",
  "Si hoy fuera nuestro aniversario, como lo celebrariamos a distancia?",
  "Que foto tuya de esta semana quiero ver?",
  "Que parte de tu rutina te gustaria compartir mas conmigo?",
  "Cual es tu 'te quiero' favorito de los que nos hemos dicho?",
  "Que haras manana que quieras que te pregunte despues?"
];

const QUIZ: { text: string; options: string[] }[] = [
  { text: "Plan ideal de viernes por la noche", options: ["Peli y manta", "Salir a cenar", "Videojuegos juntos", "Dormir temprano"] },
  { text: "Comida que podria comer toda la vida", options: ["Pizza", "Sushi", "Pasta", "Tacos"] },
  { text: "Como gestiona un dia malo", options: ["Hablarlo todo", "Silencio y espacio", "Distraerse con algo", "Dormir y manana sera otro dia"] },
  { text: "Superpoder que elegiria", options: ["Teletransporte", "Leer mentes", "Parar el tiempo", "Volar"] },
  { text: "En una fiesta es...", options: ["El alma de la fiesta", "El de las conversaciones profundas", "El que baila sin parar", "El que se va pronto"] },
  { text: "Destino de escapada sonada", options: ["Playa remota", "Ciudad europea", "Montana y cabana", "Japon"] },
  { text: "Lo primero que hace al despertar", options: ["Mirar el movil", "Remolonear 20 minutos", "Levantarse de golpe", "Pensar en desayunar"] },
  { text: "Pelicula para ver en bucle", options: ["Una comedia romantica", "Algo de accion", "Animacion", "Un clasico de siempre"] },
  { text: "Su forma favorita de recibir carino", options: ["Palabras bonitas", "Tiempo juntos", "Detalles y regalos", "Contacto fisico"] },
  { text: "Si le tocara la loteria manana...", options: ["Viajar un ano entero", "Comprar casa ya", "Invertirlo casi todo", "Dejar de trabajar"] },
  { text: "Su bebida de siempre", options: ["Cafe", "Te", "Cola / refresco", "Agua y ya"] },
  { text: "Miedo confesable", options: ["Aranas / bichos", "Alturas", "Hablar en publico", "Peliculas de terror"] }
];

async function main() {
  console.log("Sembrando prompts y quiz...");
  const promptCount = await prisma.dailyPrompt.count();
  if (promptCount === 0) {
    await prisma.dailyPrompt.createMany({ data: PROMPTS.map((text) => ({ text })) });
  }
  const quizCount = await prisma.quizQuestion.count();
  if (quizCount === 0) {
    await prisma.quizQuestion.createMany({ data: QUIZ });
  }

  console.log("Creando pareja demo (ana@near.demo / leo@near.demo, password: neardemo123)...");
  const existing = await prisma.user.findUnique({ where: { email: "ana@near.demo" } });
  if (existing) {
    console.log("La pareja demo ya existe, no se duplica.");
    return;
  }

  const passwordHash = await bcrypt.hash("neardemo123", 12);
  const couple = await prisma.couple.create({
    data: { anniversary: new Date("2024-02-14") }
  });
  const ana = await prisma.user.create({
    data: { email: "ana@near.demo", name: "Ana", passwordHash, coupleId: couple.id, presence: "FREE", presenceUpdatedAt: new Date() }
  });
  const leo = await prisma.user.create({
    data: { email: "leo@near.demo", name: "Leo", passwordHash, coupleId: couple.id, presence: "STUDYING", presenceUpdatedAt: new Date() }
  });
  await prisma.dateRoomState.create({ data: { coupleId: couple.id } });

  const now = Date.now();
  const min = 60 * 1000;
  await prisma.message.createMany({
    data: [
      { coupleId: couple.id, senderId: ana.id, body: "Buenos dias ☀️ hoy me he despertado pensando en ti", createdAt: new Date(now - 180 * min) },
      { coupleId: couple.id, senderId: leo.id, body: "Y yo con tu audio de anoche en bucle 🥹", createdAt: new Date(now - 175 * min) },
      { coupleId: couple.id, senderId: ana.id, body: "27 dias para verte. Se me hace eterno y cortisimo a la vez", createdAt: new Date(now - 60 * min) },
      { coupleId: couple.id, senderId: leo.id, body: "Ya tengo lista de sitios a los que llevarte 🗺️", createdAt: new Date(now - 55 * min) }
    ]
  });

  const dateKey = new Date().toISOString().slice(0, 10);
  await prisma.moodEntry.createMany({
    data: [
      { coupleId: couple.id, userId: ana.id, mood: "enamorada", note: "Dia largo pero contenta", dateKey },
      { coupleId: couple.id, userId: leo.id, mood: "cansado", note: "Semana de examenes...", dateKey }
    ]
  });

  await prisma.note.createMany({
    data: [
      { coupleId: couple.id, authorId: ana.id, body: "No olvides que estoy orgullosa de ti. Suerte manana 💛" },
      { coupleId: couple.id, authorId: leo.id, body: "Reserva el 14: sorpresa preparada." }
    ]
  });

  const day = 24 * 60 * min;
  await prisma.calendarEvent.createMany({
    data: [
      { coupleId: couple.id, createdById: ana.id, title: "Reencuentro en Madrid", kind: "VISIT", startsAt: new Date(now + 27 * day), description: "Por fin. Terminal T4, 18:40." },
      { coupleId: couple.id, createdById: leo.id, title: "Cita virtual: noche de pelis", kind: "DATE", startsAt: new Date(now + 2 * day), showCountdown: false },
      { coupleId: couple.id, createdById: ana.id, title: "Nuestro aniversario", kind: "ANNIVERSARY", startsAt: new Date("2027-02-14T20:00:00") }
    ]
  });

  await prisma.moment.createMany({
    data: [
      { coupleId: couple.id, authorId: leo.id, kind: "NOTE", title: "La videollamada de 4 horas", body: "Se suponia que ibamos a estudiar. Nos dieron las 2am hablando de nombres de perro.", happenedAt: new Date(now - 3 * day) },
      { coupleId: couple.id, authorId: ana.id, kind: "MEMORY", title: "El dia del aeropuerto", body: "Todavia recuerdo la cara que pusiste cuando saliste por la puerta y me viste con el cartel ridiculo.", happenedAt: new Date(now - 40 * day) }
    ]
  });

  await prisma.nudge.create({ data: { coupleId: couple.id, fromId: leo.id, createdAt: new Date(now - 20 * min) } });

  // actividad y duelos de ejemplo (racha viva + temporada con puntos)
  const dayKeys = [0, 1, 2].map((offset) => {
    const d = new Date(now - offset * day);
    return d.toISOString().slice(0, 10);
  });
  for (const [index, key] of dayKeys.entries()) {
    await prisma.activityDay.createMany({
      data: [
        { coupleId: couple.id, userId: ana.id, dateKey: key, points: 24 - index * 4 },
        { coupleId: couple.id, userId: leo.id, dateKey: key, points: 19 - index * 3 }
      ],
      skipDuplicates: true
    });
  }
  await prisma.gameScore.createMany({
    data: [
      { coupleId: couple.id, userId: ana.id, gameKey: "reaction", dateKey: dayKeys[1], score: 289 },
      { coupleId: couple.id, userId: leo.id, gameKey: "reaction", dateKey: dayKeys[1], score: 312 },
      { coupleId: couple.id, userId: ana.id, gameKey: "targets", dateKey: dayKeys[2], score: 27 },
      { coupleId: couple.id, userId: leo.id, gameKey: "targets", dateKey: dayKeys[2], score: 33 }
    ]
  });

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
