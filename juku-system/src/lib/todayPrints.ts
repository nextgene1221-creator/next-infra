import { prisma } from "@/lib/prisma";

// 当日使用するゼミプリントの集計（サーバー専用）。
// ダッシュボードとゼミ管理で同じビューを共有するためにここへ切り出した（新規依頼 B-5）。
//
// 単元 × プリント No. 単位でまとめ、対象生徒を個別に持つ。
// 「完了」は生徒がそのプリントを実施し終えたことを指す（印刷・準備の完了ではない）。

export type TodayPrintStudent = {
  printId: string;
  studentId: string;
  studentName: string;
  completed: boolean;
};

export type TodayPrintRow = {
  key: string;
  subject: string;
  unitName: string;
  printNo: number;
  /** 必要枚数＝その日にそのプリントを予約している生徒の総数（完了済みも含む） */
  total: number;
  /** まだ実施していない人数 */
  remaining: number;
  students: TodayPrintStudent[];
};

export async function getTodayPrintRows(now: Date = new Date()): Promise<TodayPrintRow[]> {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 完了済みも含めて取得する。何枚刷ったかの根拠が消えると困るため（B-5 (b)）。
  const raw = await prisma.studentPrint.findMany({
    where: { scheduledDate: { gte: todayStart, lte: todayEnd } },
    include: {
      printUnit: true,
      student: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ printUnit: { subject: "asc" } }, { printUnit: { name: "asc" } }, { printNo: "asc" }],
  });

  const grouped = new Map<string, TodayPrintRow>();
  for (const p of raw) {
    const key = `${p.printUnitId}|${p.printNo}`;
    let row = grouped.get(key);
    if (!row) {
      row = {
        key,
        subject: p.printUnit.subject,
        unitName: p.printUnit.name,
        printNo: p.printNo,
        total: 0,
        remaining: 0,
        students: [],
      };
      grouped.set(key, row);
    }
    row.students.push({
      printId: p.id,
      studentId: p.studentId,
      studentName: p.student.user.name,
      completed: p.completedDate !== null,
    });
  }

  for (const row of grouped.values()) {
    row.students.sort((a, b) => a.studentName.localeCompare(b.studentName, "ja"));
    row.total = row.students.length;
    row.remaining = row.students.filter((s) => !s.completed).length;
  }

  return Array.from(grouped.values());
}
