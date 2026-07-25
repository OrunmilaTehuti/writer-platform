import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function GET(req: Request, { params }: { params: { postId: string } }) {
  const comments = await prisma.comment.findMany({
    where: { postId: params.postId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, handle: true, displayName: true, avatarUrl: true } } },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: { params: { postId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const { postId } = params;

  const { body } = await req.json();
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }
  if (body.length > 1000) {
    return NextResponse.json({ error: "Comment is too long (max 1000 characters)." }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { body, authorId: userId, postId },
    include: { author: { select: { id: true, handle: true, displayName: true, avatarUrl: true } } },
  });

  // Notify the post's author, unless they're commenting on their own post.
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (post && post.authorId !== userId) {
    await prisma.notification.create({
      data: { type: "COMMENT", recipientId: post.authorId, actorId: userId, postId },
    });
  }

  return NextResponse.json({ comment });
}
