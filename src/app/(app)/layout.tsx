import { requireUser } from "@/lib/couple";
import { prisma } from "@/lib/db";
import { LiveRefresh } from "@/components/live-refresh";
import { Sidebar } from "@/components/layout/sidebar";
import { NudgeToast } from "@/components/layout/nudge-toast";
import { TimezoneSync } from "@/components/timezone-sync";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  let unreadChat = 0;
  if (user.coupleId) {
    unreadChat = await prisma.message.count({
      where: {
        coupleId: user.coupleId,
        channel: "MAIN",
        senderId: { not: user.id },
        createdAt: { gt: user.lastChatSeenAt ?? new Date(0) }
      }
    });
  }

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar userName={user.name} unreadChat={unreadChat} />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      {user.coupleId && <NudgeToast myId={user.id} />}
      {user.coupleId && <LiveRefresh types={["message:new"]} />}
      <TimezoneSync current={user.timezone} />
    </div>
  );
}
