import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const role = session.user.role;

  const audienceFilter = role === "admin" ? undefined : { in: [role, "both"] };

  const posts = await prisma.blogPost.findMany({
    where: {
      ...(audienceFilter ? { audience: audienceFilter } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { category: true, author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { title, body, audience, categoryId, images, publishedAt } = await req.json();
  if (!title || !body || !categoryId) {
    return NextResponse.json({ error: "タイトル・本文・カテゴリは必須です" }, { status: 400 });
  }
  const post = await prisma.blogPost.create({
    data: {
      title,
      body,
      audience: audience || "both",
      categoryId,
      authorId: session.user.id,
      images: JSON.stringify(Array.isArray(images) ? images : []),
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    },
  });
  return NextResponse.json(post, { status: 201 });
}
