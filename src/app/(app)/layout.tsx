import { requireUser } from "@/lib/couple";
import { prisma } from "@/lib/db";
import { CallProvider } from "@/features/call/call-context";
import { LiveRefresh } from "@/components/live-refresh";
import { Sidebar } from "@/components/layout/sidebar";
import { NudgeToast } from "@/components/layout/nudge-toast";
import { RepairToast } from "@/components/layout/repair-toast";
import { TouchInvite } from "@/features/touch/touch-invite";
import { TimezoneSync } from "@/components/timezone-sync";
import type { MemberInfo } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  let unreadChat = 0;
  let partner: MemberInfo | null = null;
  let partnerTimezone: string | null = null;
  if (user.coupleId) {
    const [count, couple] = await Promise.all([
      prisma.message.count({
        where: {
          coupleId: user.coupleId,
          channel: "MAIN",
          senderId: { not: user.id },
          createdAt: { gt: user.lastChatSeenAt ?? new Date(0) }
        }
      }),
      prisma.couple.findUnique({
        where: { id: user.coupleId },
        include: { members: { select: { id: true, name: true, image: true, timezone: true } } }
      })
    ]);
    unreadChat = count;
    const partnerMember = couple?.members.find((m) => m.id !== user.id) ?? null;
    partner = partnerMember
      ? { id: partnerMember.id, name: partnerMember.name, image: partnerMember.image }
      : null;
    partnerTimezone = partnerMember?.timezone ?? null;
  }

  const me: MemberInfo = { id: user.id, name: user.name, image: user.image };

  const content = (
    <div className="min-h-dvh md:flex">
      <Sidebar userName={user.name} unreadChat={unreadChat} />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      {user.coupleId && <NudgeToast myId={user.id} />}
      {user.coupleId && <RepairToast myId={user.id} />}
      {user.coupleId && <TouchInvite myId={user.id} />}
      {user.coupleId && <LiveRefresh types={["message:new"]} />}
      <TimezoneSync current={user.timezone} />
    </div>
  );

  // El motor de llamada vive por encima de las páginas: la llamada suena y
  // sobrevive a la navegacion. Sin pareja (onboarding) no hace falta.
  if (!user.coupleId) return content;
  return (
    <CallProvider
      me={me}
      partner={partner}
      myTimezone={user.timezone}
      partnerTimezone={partnerTimezone}
    >
      {content}
    </CallProvider>
  );
}
