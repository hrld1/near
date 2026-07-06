import { NextResponse, type NextRequest } from "next/server";

// Comprobacion ligera de cookie de sesión (edge-safe, sin Prisma).
// La proteccion real la hacen los layouts/páginas de servidor via auth().
const PUBLIC_PATHS = ["/", "/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /join/[code] tiene que ser público: quien recibe el enlace de invitación
  // aún no tiene cuenta (la propia página ofrece crearla). La página filtra
  // los códigos inválidos por su cuenta.
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/api");
  if (isPublic) {
    return NextResponse.next();
  }
  const hasSession =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token");
  if (!hasSession) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Excluye estaticos y los recursos de la PWA (sw.js y manifest deben ser
  // publicos: sin ello, el navegador recibiria un redirect a /login).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icons/|.*\\.(?:svg|png|jpg|ico)).*)"
  ]
};
