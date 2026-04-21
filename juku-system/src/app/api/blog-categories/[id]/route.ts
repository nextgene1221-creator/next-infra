import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { name, sortOrder } = await req.json();
  const cat = await prisma.blogCategory.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  });
  return NextResponse.json(cat);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const postCount = await prisma.blogPost.count({ where: { categoryId: id } });
  if (postCount > 0) {
    return NextResponse.json({ error: "このカテゴリには記事があるため削除できません" }, { status: 400 });
  }
  await prisma.blogCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
