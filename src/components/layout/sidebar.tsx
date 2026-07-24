"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookHeart,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  Users
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// 5 destinos, dos verbos y dos sustantivos: Hoy (estar), Chat (hablar),
// Juntos (hacer a la vez), Recuerdos (recordar) y Ajustes. Cada destino
// "posee" varias rutas: por eso el resaltado va por prefijos (match).
type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  match: string[];
};

const PRIMARY: NavItem[] = [
  { href: "/home", label: "Hoy", icon: Home, match: ["/home"] },
  { href: "/chat", label: "Chat", icon: MessageCircle, match: ["/chat"] },
  {
    href: "/juntos",
    label: "Juntos",
    icon: Users,
    match: ["/juntos", "/date-room", "/canvas", "/play"]
  },
  {
    href: "/recuerdos",
    label: "Recuerdos",
    icon: BookHeart,
    match: ["/recuerdos", "/moments", "/letters", "/calendar", "/map", "/recap", "/libro"]
  }
];

const SETTINGS: NavItem = { href: "/settings", label: "Ajustes", icon: Settings, match: ["/settings"] };

function isActive(item: NavItem, pathname: string) {
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function Sidebar({ userName, unreadChat = 0 }: { userName: string; unreadChat?: number }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: raíl de cristal flotante (it27) */}
      <aside className="sticky top-0 z-40 hidden h-dvh shrink-0 py-4 pl-4 md:flex">
        <div className="glass flex w-56 flex-col rounded-3xl px-3 py-5 shadow-card">
          <Link href="/home" className="mb-8 flex items-center gap-2.5 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose to-plum text-white shadow-glow">
              <Heart className="h-4 w-4 fill-current motion-safe:animate-heartbeat" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight text-ink">Near</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1.5">
            {PRIMARY.map((item) => {
              const active = isActive(item, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-rose to-plum text-white shadow-glow"
                      : "text-ink-soft hover:translate-x-0.5 hover:bg-sand/80 hover:text-ink"
                  )}
                >
                  <span className="relative">
                    <item.icon
                      className={cn("h-[18px] w-[18px] transition-transform", !active && "group-hover:scale-110")}
                    />
                    {item.href === "/chat" && unreadChat > 0 && (
                      <span
                        className={cn(
                          "absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                          active ? "bg-white text-rose-deep" : "bg-rose text-white"
                        )}
                      >
                        {unreadChat > 9 ? "9+" : unreadChat}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-between gap-1 border-t border-sand/70 px-1.5 pt-4">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar name={userName} size="sm" />
              <span className="truncate text-sm font-medium text-ink">{userName}</span>
            </div>
            <Link
              href="/settings"
              title="Ajustes"
              className={cn(
                "rounded-lg p-2 transition hover:bg-sand hover:text-ink",
                isActive(SETTINGS, pathname) ? "text-rose-deep" : "text-ink-soft"
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
            <ThemeToggle />
            <form action={logoutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="rounded-lg p-2 text-ink-soft transition hover:bg-sand hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Móvil: barra flotante de cristal con el activo en píldora (it27) */}
      <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <div className="glass flex rounded-3xl px-1.5 py-1.5 shadow-lift">
          {[...PRIMARY, SETTINGS].map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-2xs font-semibold transition-all duration-200",
                  active
                    ? "bg-gradient-to-b from-rose to-rose-deep text-white shadow-glow"
                    : "text-ink-soft active:scale-95"
                )}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.href === "/chat" && unreadChat > 0 && (
                    <span
                      className={cn(
                        "absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[8px] font-bold",
                        active ? "bg-white text-rose-deep" : "bg-rose text-white"
                      )}
                    >
                      {unreadChat > 9 ? "9+" : unreadChat}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
