import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 収集済みの大学入試情報を検索・一覧する（依頼⑤）。admin限定。
// クエリ: q（大学名・学部・学科）/ subject（受験科目）/ method（入試方式）

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const subject = (sp.get("subject") || "").trim();
  const method = (sp.get("method") || "").trim();

  const admissions = await prisma.universityAdmission.findMany({
    where: {
      ...(subject ? { subjects: { contains: subject, mode: "insensitive" as const } } : {}),
      ...(method ? { method: { contains: method, mode: "insensitive" as const } } : {}),
      ...(q
        ? {
            OR: [
              { university: { is: { name: { contains: q, mode: "insensitive" as const } } } },
              { faculty: { contains: q, mode: "insensitive" as const } },
              { department: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: {
      university: { select: { name: true, prefecture: true, category: true } },
      revisions: { orderBy: { changedAt: "desc" }, take: 3 },
    },
    orderBy: [{ university: { name: "asc" } }, { faculty: "asc" }, { method: "asc" }],
    take: 500,
  });

  const rows = admissions.map((a) => ({
    id: a.id,
    universityName: a.university.name,
    prefecture: a.university.prefecture,
    category: a.university.category,
    faculty: a.faculty,
    department: a.department,
    method: a.method,
    targetYear: a.targetYear,
    examDate: a.examDate,
    applicationPeriod: a.applicationPeriod,
    subjects: a.subjects,
    capacity: a.capacity,
    deviationTarget: a.deviationTarget,
    examFee: a.examFee,
    sourceUrl: a.sourceUrl,
    lastCrawledAt: a.lastCrawledAt?.toISOString() ?? null,
    revisions: a.revisions.map((r) => ({
      changedAt: r.changedAt.toISOString(),
      summary: r.summary,
    })),
  }));

  const universityCount = new Set(rows.map((r) => r.universityName)).size;
  return NextResponse.json({ count: rows.length, universityCount, rows });
}
