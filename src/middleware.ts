import { NextResponse, type NextRequest } from "next/server";

// Comprobacion ligera de cookie de sesion (edge-safe, sin Prisma).
// La proteccion real la hacen los layouts/paginas de servidor via auth().
const PUBLIC_PATHS = ["/", "/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api")) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)"]
};
