import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json([], { status: 200 });
  }

  const teachers = await prisma.teacher.findMany({
    where: { status: "active" },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(
    teachers.map((t) => ({ id: t.id, name: t.user.name }))
  );
}
