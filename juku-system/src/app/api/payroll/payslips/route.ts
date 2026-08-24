import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePayroll, payslipItemData } from "@/lib/payroll";

// 給与明細（新規依頼 B-9）。
// 閲覧権限: 本人と管理者のみ（B-9(f)）。他の職員の金額は見えない。
// 生成・再生成は管理者のみ。確定済み(confirmed)は再生成しない。

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const yearMonth = searchParams.get("yearMonth") || "";
  const isAdmin = session.user.role === "admin";

  const payslips = await prisma.payslip.findMany({
    where: {
      ...(yearMonth ? { yearMonth } : {}),
      // 管理者以外は自分の明細のみ
      ...(isAdmin ? {} : { userId: session.user.id }),
    },
    orderBy: [{ yearMonth: "desc" }, { userId: "asc" }],
    include: {
      user: { select: { id: true, name: true, role: true } },
      items: { orderBy: { date: "asc" } },
    },
  });
  return NextResponse.json(payslips);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const yearMonth = typeof body.yearMonth === "string" ? body.yearMonth : "";
  if (!userId || !/^\d{4}-\d{2}$/.test(yearMonth)) {
    return NextResponse.json({ error: "対象者と対象月(YYYY-MM)は必須です" }, { status: 400 });
  }

  const existing = await prisma.payslip.findUnique({
    where: { userId_yearMonth: { userId, yearMonth } },
  });
  if (existing && existing.status === "confirmed") {
    return NextResponse.json(
      { error: "確定済みの明細です。再生成するには先に確定を解除してください。" },
      { status: 409 },
    );
  }

  const calc = await calculatePayroll(userId, yearMonth);
  if (calc.missingWage) {
    return NextResponse.json(
      { error: `適用できる時給が無いため生成できません。先に時給を設定してください。（${calc.warnings.join(" / ")}）` },
      { status: 400 },
    );
  }

  const adjustmentYen = existing?.adjustmentYen ?? 0;
  // 支給合計 = 勤務分 + 交通費 + 手動調整
  const totalYen = calc.baseYen + calc.transportYen + adjustmentYen;

  const payslip = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.payslipItem.deleteMany({ where: { payslipId: existing.id } });
      await tx.payslip.update({
        where: { id: existing.id },
        data: {
          totalMinutes: calc.totalMinutes,
          baseYen: calc.baseYen,
          workDays: calc.workDays,
          transportYen: calc.transportYen,
          totalYen,
          warnings: JSON.stringify(calc.warnings),
          items: { create: payslipItemData(calc.days) },
        },
      });
      return tx.payslip.findUnique({
        where: { id: existing.id },
        include: { user: { select: { id: true, name: true, role: true } }, items: { orderBy: { date: "asc" } } },
      });
    }
    return tx.payslip.create({
      data: {
        userId,
        yearMonth,
        totalMinutes: calc.totalMinutes,
        baseYen: calc.baseYen,
        workDays: calc.workDays,
        transportYen: calc.transportYen,
        adjustmentYen: 0,
        totalYen: calc.baseYen + calc.transportYen,
        warnings: JSON.stringify(calc.warnings),
        items: { create: payslipItemData(calc.days) },
      },
      include: { user: { select: { id: true, name: true, role: true } }, items: { orderBy: { date: "asc" } } },
    });
  });

  return NextResponse.json(payslip);
}
