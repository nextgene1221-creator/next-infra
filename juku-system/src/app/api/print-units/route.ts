import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const units = await prisma.printUnit.findMany({ orderBy: [{ subject: "asc" }, { name: "asc" }] });
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { subject, name, printCount } = await req.json();
  if (!subject || !name || !printCount) {
    return NextResponse.json({ error: "subject, name, printCount are required" }, { status: 400 });
  }
  const unit = await prisma.printUnit.create({
    data: { subject, name, printCount: Number(printCount) },
  });
  return NextResponse.json(unit, { status: 201 });
}
