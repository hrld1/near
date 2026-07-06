"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarHeart,
  Gamepad2,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  MonitorPlay,
  BookHeart,
  Settings
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/moments", label: "Momentos", icon: BookHeart },
  { href: "/calendar", label: "Fechas", icon: CalendarHeart },
  { href: "/date-room", label: "Cita", icon: MonitorPlay },
  { href: "/play", label: "Arcade", icon: Gamepad2 }
];

export function Sidebar({ userName, unreadChat = 0 }: { userName: string; unreadChat?: number }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-sand bg-paper/70 px-3 py-5 backdrop-blur md:flex">
        <Link href="/home" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose text-white">
            <Heart className="h-4 w-4 fill-current" />
          </span>
          <span className="font-display text-xl text-ink">Near</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-rose-faint text-rose-deep"
                    : "text-ink-soft hover:bg-sand hover:text-ink"
                )}
              >
                <span className="relative">
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.href === "/chat" && unreadChat > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[9px] font-bold text-white">
                      {unreadChat > 9 ? "9+" : unreadChat}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between gap-1 border-t border-sand px-2 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={userName} size="sm" />
            <span className="truncate text-sm font-medium text-ink">{userName}</span>
          </div>
          <Link
            href="/settings"
            title="Ajustes"
            className={cn(
              "rounded-lg p-2 transition hover:bg-sand hover:text-ink",
              pathname.startsWith("/settings") ? "text-rose-deep" : "text-ink-soft"
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
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sand bg-paper/90 backdrop-blur md:hidden">
        {[...NAV, { href: "/settings", label: "Ajustes", icon: Settings }].map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                active ? "text-rose-deep" : "text-ink-soft"
              )}
            >
              <span className="relative">
                <item.icon className="h-5 w-5" />
                {item.href === "/chat" && unreadChat > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose px-1 text-[8px] font-bold text-white">
                    {unreadChat > 9 ? "9+" : unreadChat}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
