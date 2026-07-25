import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const users = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: {
      id: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
      followedBy: { where: { followerId: userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const shaped = users.map((u) => ({
    id: u.id,
    handle: u.handle,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    isFollowing: u.followedBy.length > 0,
  }));

  return NextResponse.json({ users: shaped });
}
