import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const docs = await prisma.document.findMany({
    where: { format: "BLOG", isPublic: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      owner: { select: { displayName: true, handle: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ docs });
}
