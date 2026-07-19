import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const followerId = (session.user as any).id as string;

  const { userId: followingId } = await req.json();
  if (!followingId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  if (followingId === followerId) {
    return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({ data: { followerId, followingId } });
  await prisma.notification.create({
    data: { type: "FOLLOW", recipientId: followingId, actorId: followerId },
  });
  return NextResponse.json({ following: true });
}
