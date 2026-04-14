import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { campus, boothCapacity, tableCapacity } = await req.json();
  if (!campus || boothCapacity == null || tableCapacity == null) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  const updated = await prisma.studyRoomConfig.upsert({
    where: { campus },
    create: {
      campus,
      boothCapacity: Math.max(0, Number(boothCapacity)),
      tableCapacity: Math.max(0, Number(tableCapacity)),
    },
    update: {
      boothCapacity: Math.max(0, Number(boothCapacity)),
      tableCapacity: Math.max(0, Number(tableCapacity)),
    },
  });
  return NextResponse.json(updated);
}
