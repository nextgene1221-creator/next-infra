import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { title, body, audience, categoryId, images, publishedAt } = await req.json();
  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      ...(body ? { body } : {}),
      ...(audience ? { audience } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(images ? { images: JSON.stringify(images) } : {}),
      ...(publishedAt ? { publishedAt: new Date(publishedAt) } : {}),
    },
  });
  return NextResponse.json(post);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.blogPost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
