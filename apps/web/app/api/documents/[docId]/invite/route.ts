import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function POST(req: Request, { params }: { params: { docId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const ownerId = (session.user as any).id as string;

  const doc = await prisma.document.findUnique({ where: { id: params.docId } });
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (doc.ownerId !== ownerId) {
    return NextResponse.json({ error: "Only the document owner can invite collaborators." }, { status: 403 });
  }

  const { handle } = await req.json();
  if (!handle || typeof handle !== "string") {
    return NextResponse.json({ error: "handle is required." }, { status: 400 });
  }

  const invitee = await prisma.user.findUnique({ where: { handle } });
  if (!invitee) return NextResponse.json({ error: "No user found with that handle." }, { status: 404 });
  if (invitee.id === ownerId) {
    return NextResponse.json({ error: "You can't invite yourself." }, { status: 400 });
  }

  // The social gate: the invitee must already follow the owner before an
  // invite can even be created. This keeps collaboration invites within
  // an existing trust relationship rather than open to anyone.
  const alreadyFollows = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: invitee.id, followingId: ownerId } },
  });
  if (!alreadyFollows) {
    return NextResponse.json(
      { error: `@${handle} needs to follow you before you can invite them to collaborate.` },
      { status: 403 }
    );
  }

  const existing = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: doc.id, userId: invitee.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "An invite already exists for this person." }, { status: 409 });
  }

  const collaborator = await prisma.documentCollaborator.create({
    data: { documentId: doc.id, userId: invitee.id, status: "PENDING" },
  });

  return NextResponse.json({ collaborator });
}
