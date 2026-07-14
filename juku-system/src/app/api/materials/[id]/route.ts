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
  const { subject, name, publisher, totalPages, level, active } = await req.json();
  const updated = await prisma.material.update({
    where: { id },
    data: {
      ...(subject !== undefined ? { subject: String(subject).trim() } : {}),
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(publisher !== undefined
        ? { publisher: publisher ? String(publisher).trim() : null }
        : {}),
      ...(totalPages !== undefined
        ? { totalPages: totalPages === "" || totalPages == null ? null : Number(totalPages) || null }
        : {}),
      ...(level !== undefined ? { level: level ? String(level).trim() : "" } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
    },
  });
  return NextResponse.json(updated);
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
  await prisma.material.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
