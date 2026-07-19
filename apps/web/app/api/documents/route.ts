import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const owned = await prisma.document.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, format: true, updatedAt: true, ownerId: true },
  });

  const collaboratingOn = await prisma.document.findMany({
    where: {
      collaborators: { some: { userId, status: "ACCEPTED" } },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      format: true,
      updatedAt: true,
      ownerId: true,
      owner: { select: { displayName: true } },
    },
  });

  const pendingInvites = await prisma.documentCollaborator.findMany({
    where: { userId, status: "PENDING" },
    include: {
      document: { select: { id: true, title: true, format: true, owner: { select: { displayName: true } } } },
    },
  });

  return NextResponse.json({ owned, collaboratingOn, pendingInvites });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const { title, format } = await req.json();
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!["SCREENPLAY", "BLOG", "ACADEMIC"].includes(format)) {
    return NextResponse.json({ error: "Invalid format." }, { status: 400 });
  }

  const doc = await prisma.document.create({
    data: {
      title,
      format,
      ownerId: userId,
      content: { type: "doc", content: [] },
    },
  });

  return NextResponse.json({ document: doc });
}
