import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const notifications = await prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { actor: { select: { id: true, handle: true, displayName: true } } },
  });

  const unreadCount = await prisma.notification.count({
    where: { recipientId: userId, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

// Marks all of the current user's notifications as read (called when they
// open the notifications panel).
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  await prisma.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
