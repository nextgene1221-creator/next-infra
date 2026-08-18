import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PayrollManager, { type StaffRow } from "./PayrollManager";
import { type PayslipDetail } from "@/components/PayslipView";

export const dynamic = "force-dynamic";

function currentYearMonthJst(): string {
  const j = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, "0")}`;
}

// 今日時点で適用されている時給を選ぶ。effectiveFrom 降順の配列を前提とする。
// （Date.now() はコンポーネント本体ではなくここで呼ぶ。react-hooks/purity 対策）
function pickCurrentWage<T extends { effectiveFrom: Date }>(history: T[]): T | null {
  const now = Date.now();
  return history.find((w) => w.effectiveFrom.getTime() <= now) ?? null;
}

// 給与計算（新規依頼 B-9）。管理者のみ。本人用は /payroll/me。
export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  await requireAuth(["admin"]);
  const params = await searchParams;
  const yearMonth = /^\d{4}-\d{2}$/.test(params.ym || "") ? params.ym! : currentYearMonthJst();

  const [users, wages, payslips] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["admin", "teacher"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.hourlyWage.findMany({ orderBy: { effectiveFrom: "desc" } }),
    prisma.payslip.findMany({
      where: { yearMonth },
      include: { user: { select: { name: true } }, items: { orderBy: { date: "asc" } } },
    }),
  ]);

  const slipByUser = new Map(payslips.map((p) => [p.userId, p]));

  const staff: StaffRow[] = users.map((u) => {
    const history = wages.filter((w) => w.userId === u.id);
    // 「現在の時給」＝ 今日時点で適用される最新のもの
    const current = pickCurrentWage(history);
    const p = slipByUser.get(u.id);
    const payslip: PayslipDetail | null = p
      ? {
          id: p.id,
          userName: p.user.name,
          yearMonth: p.yearMonth,
          totalMinutes: p.totalMinutes,
          baseYen: p.baseYen,
          adjustmentYen: p.adjustmentYen,
          adjustmentNote: p.adjustmentNote,
          totalYen: p.totalYen,
          status: p.status,
          confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
          warnings: JSON.parse(p.warnings || "[]"),
          items: p.items.map((it) => ({
            id: it.id,
            date: it.date.toISOString(),
            minutes: it.minutes,
            hourlyYen: it.hourlyYen,
            amountYen: it.amountYen,
            note: it.note,
          })),
        }
      : null;

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      currentHourlyYen: current ? current.hourlyYen : null,
      wageHistory: history.map((w) => ({
        id: w.id,
        hourlyYen: w.hourlyYen,
        effectiveFrom: w.effectiveFrom.toISOString(),
        note: w.note,
      })),
      payslip,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-2 print:hidden">給与計算</h1>
      <p className="text-sm text-dark/60 mb-6 print:hidden">
        出退勤の記録から月次の給与明細を作成します。時給を設定 → 明細を生成 → 内容を確認して確定、の順で進めます。
        深夜手当・残業・交通費は自動計算しないため、必要な場合は明細ごとの「調整」で入力してください。
      </p>
      <PayrollManager yearMonth={yearMonth} staff={staff} />
    </div>
  );
}
