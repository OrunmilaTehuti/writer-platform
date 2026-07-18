import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@writer-platform/db";

export async function POST(req: Request) {
  const { email, password, handle, displayName } = await req.json();

  if (!email || !password || !handle || !displayName) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const existingHandle = await prisma.user.findUnique({ where: { handle } });
  if (existingHandle) {
    return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, handle, displayName },
  });

  return NextResponse.json({ id: user.id, email: user.email, handle: user.handle });
}
