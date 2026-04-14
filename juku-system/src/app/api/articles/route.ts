import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const role = session.user.role;

  const audienceFilter =
    role === "admin"
      ? undefined
      : { in: [role, "both"] };

  const articles = await prisma.article.findMany({
    where: {
      ...(audienceFilter ? { audience: audienceFilter } : {}),
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { title, body, audience, category, images, publishedAt } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "タイトルと本文は必須です" }, { status: 400 });
  }
  const article = await prisma.article.create({
    data: {
      title,
      body,
      audience: audience || "both",
      category: category || "その他",
      images: JSON.stringify(Array.isArray(images) ? images : []),
      publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    },
  });
  return NextResponse.json(article, { status: 201 });
}
