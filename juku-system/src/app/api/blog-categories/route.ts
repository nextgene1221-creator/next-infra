import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const cat = await prisma.blogCategory.create({
    data: { name, sortOrder: await prisma.blogCategory.count() },
  });
  return NextResponse.json(cat, { status: 201 });
}
