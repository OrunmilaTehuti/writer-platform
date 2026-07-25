import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const authorIds = [userId, ...following.map((f) => f.followingId)];

  const posts = await prisma.post.findMany({
    where: { authorId: { in: authorIds } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, handle: true, displayName: true, avatarUrl: true } },
      likes: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const shaped = posts.map((p) => ({
    id: p.id,
    type: p.type,
    body: p.body,
    createdAt: p.createdAt,
    author: p.author,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    likedByMe: p.likes.length > 0,
  }));

  return NextResponse.json({ posts: shaped });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const { body } = await req.json();
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json({ error: "Post body is required." }, { status: 400 });
  }
  if (body.length > 2000) {
    return NextResponse.json({ error: "Post is too long (max 2000 characters)." }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: { type: "STATUS", body, authorId: userId },
    include: { author: { select: { id: true, handle: true, displayName: true, avatarUrl: true } } },
  });

  return NextResponse.json({
    id: post.id,
    type: post.type,
    body: post.body,
    createdAt: post.createdAt,
    author: post.author,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
  });
}
