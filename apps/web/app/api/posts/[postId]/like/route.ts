import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function POST(req: Request, { params }: { params: { postId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const { postId } = params;

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.like.create({ data: { userId, postId } });

  // Notify the post's author, unless they liked their own post.
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (post && post.authorId !== userId) {
    await prisma.notification.create({
      data: { type: "LIKE", recipientId: post.authorId, actorId: userId, postId },
    });
  }

  return NextResponse.json({ liked: true });
}
