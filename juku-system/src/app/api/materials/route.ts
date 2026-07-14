import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const materials = await prisma.material.findMany({
    orderBy: [{ subject: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(materials);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { subject, name, publisher, totalPages, level } = await req.json();
  if (!subject || !name) {
    return NextResponse.json({ error: "科目・教材名は必須です" }, { status: 400 });
  }
  const created = await prisma.material.create({
    data: {
      subject: String(subject).trim(),
      name: String(name).trim(),
      publisher: publisher ? String(publisher).trim() : null,
      totalPages:
        totalPages === "" || totalPages == null ? null : Number(totalPages) || null,
      level: level ? String(level).trim() : "",
    },
  });
  return NextResponse.json(created, { status: 201 });
}
