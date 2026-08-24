import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PayslipView, { type PayslipDetail } from "@/components/PayslipView";

export const dynamic = "force-dynamic";

// 自分の給与明細（新規依頼 B-9 / (f) 本人と管理者のみ閲覧可）。
// 確定済みのものだけを見せる（下書きは金額が動くため）。
export default async function MyPayslipsPage() {
  const session = await requireAuth(["admin", "teacher"]);

  const payslips = await prisma.payslip.findMany({
    where: { userId: session.user.id, status: "confirmed" },
    orderBy: { yearMonth: "desc" },
    include: { user: { select: { name: true } }, items: { orderBy: { date: "asc" } } },
  });

  const views: PayslipDetail[] = payslips.map((p) => ({
    id: p.id,
    userName: p.user.name,
    yearMonth: p.yearMonth,
    totalMinutes: p.totalMinutes,
    baseYen: p.baseYen,
    workDays: p.workDays,
    transportYen: p.transportYen,
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
      transportYen: it.transportYen,
      note: it.note,
    })),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-2 print:hidden">自分の給与明細</h1>
      <p className="text-sm text-dark/60 mb-6 print:hidden">
        確定済みの明細のみ表示されます。内容に相違がある場合は運営に連絡してください。
      </p>
      {views.length === 0 ? (
        <p className="text-sm text-dark/50">確定済みの給与明細はまだありません。</p>
      ) : (
        <div className="space-y-6">
          {views.map((p) => (
            <PayslipView key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
