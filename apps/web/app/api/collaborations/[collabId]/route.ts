import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@writer-platform/db";

export async function POST(req: Request, { params }: { params: { collabId: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { id: params.collabId },
    include: { document: { include: { owner: true } } },
  });
  if (!collaborator) return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  if (collaborator.userId !== userId) {
    return NextResponse.json({ error: "This invite isn't addressed to you." }, { status: 403 });
  }
  if (collaborator.status !== "PENDING") {
    return NextResponse.json({ error: "This invite has already been responded to." }, { status: 409 });
  }

  const { accept } = await req.json();

  if (!accept) {
    await prisma.documentCollaborator.update({
      where: { id: collaborator.id },
      data: { status: "DECLINED" },
    });
    return NextResponse.json({ status: "DECLINED" });
  }

  const invitee = await prisma.user.findUnique({ where: { id: userId } });
  const owner = collaborator.document.owner;

  await prisma.documentCollaborator.update({
    where: { id: collaborator.id },
    data: { status: "ACCEPTED" },
  });

  // Announce the collaboration on both people's timelines - deliberately
  // without naming the document/project, per the privacy requirement.
  await prisma.post.createMany({
    data: [
      {
        type: "COLLABORATION",
        authorId: owner.id,
        body: `${owner.displayName} and ${invitee?.displayName} are collaborating on a project.`,
      },
      {
        type: "COLLABORATION",
        authorId: userId,
        body: `${invitee?.displayName} and ${owner.displayName} are collaborating on a project.`,
      },
    ],
  });

  return NextResponse.json({ status: "ACCEPTED" });
}
