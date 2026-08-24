import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 明細の確定 / 確定解除 / 手動調整 / 削除。すべて管理者のみ。

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const current = await prisma.payslip.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "明細が見つかりません" }, { status: 404 });

  const data: {
    adjustmentYen?: number;
    adjustmentNote?: string;
    totalYen?: number;
    status?: string;
    confirmedAt?: Date | null;
  } = {};

  let adjustmentYen = current.adjustmentYen;
  if (body.adjustmentYen !== undefined) {
    if (current.status === "confirmed") {
      return NextResponse.json(
        { error: "確定済みの明細は金額を変更できません。先に確定を解除してください。" },
        { status: 409 },
      );
    }
    const v = Math.floor(Number(body.adjustmentYen));
    if (!Number.isFinite(v)) {
      return NextResponse.json({ error: "調整額は数値で入力してください" }, { status: 400 });
    }
    adjustmentYen = v;
    data.adjustmentYen = v;
    data.totalYen = current.baseYen + current.transportYen + v;
  }
  if (typeof body.adjustmentNote === "string") data.adjustmentNote = body.adjustmentNote.trim();

  if (typeof body.status === "string") {
    if (body.status === "confirmed") {
      data.status = "confirmed";
      data.confirmedAt = new Date();
      data.totalYen = current.baseYen + current.transportYen + adjustmentYen;
    } else if (body.status === "draft") {
      data.status = "draft";
      data.confirmedAt = null;
    } else {
      return NextResponse.json({ error: "status は draft / confirmed のみです" }, { status: 400 });
    }
  }

  const payslip = await prisma.payslip.update({
    where: { id },
    data,
    include: { user: { select: { id: true, name: true, role: true } }, items: { orderBy: { date: "asc" } } },
  });
  return NextResponse.json(payslip);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const current = await prisma.payslip.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "明細が見つかりません" }, { status: 404 });
  if (current.status === "confirmed") {
    return NextResponse.json(
      { error: "確定済みの明細は削除できません。先に確定を解除してください。" },
      { status: 409 },
    );
  }
  await prisma.payslip.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
