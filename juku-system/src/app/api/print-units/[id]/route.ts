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
  const { subject, name, printCount } = await req.json();
  const unit = await prisma.printUnit.update({
    where: { id },
    data: {
      ...(subject ? { subject } : {}),
      ...(name ? { name } : {}),
      ...(printCount !== undefined ? { printCount: Number(printCount) } : {}),
    },
  });
  return NextResponse.json(unit);
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
  await prisma.studentPrint.deleteMany({ where: { printUnitId: id } });
  await prisma.printUnit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
