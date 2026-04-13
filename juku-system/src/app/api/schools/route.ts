import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(schools);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const school = await prisma.school.create({ data: { name } });
    return NextResponse.json(school, { status: 201 });
  } catch {
    return NextResponse.json({ error: "同じ名前の学校が既に存在します" }, { status: 400 });
  }
}
