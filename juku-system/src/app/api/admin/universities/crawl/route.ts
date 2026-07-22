import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { htmlToText, extractAdmissions, admissionHash } from "@/lib/universityCrawl";

export const maxDuration = 60; // fetch + AI抽出で時間がかかるため延長（Hobby上限60s）

// 大学HPをクロールして入試情報を収集・保存する（依頼⑤）。admin限定。
// 差分検知: 既存レコードと内容ハッシュを比較し、変化があれば更新＋変更履歴を記録。

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  const universityName = typeof body.universityName === "string" ? body.universityName.trim() : "";
  const prefectureHint = typeof body.prefecture === "string" ? body.prefecture.trim() : "";
  const categoryHint = typeof body.category === "string" ? body.category.trim() : "";

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
  } catch {
    return NextResponse.json({ error: "有効なURL（http/https）を指定してください" }, { status: 400 });
  }

  // 1) ページ取得
  let html = "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "juku-system-crawler/1.0 (admission info collector)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return NextResponse.json(
        { error: `ページ取得に失敗しました (HTTP ${res.status})` },
        { status: 502 }
      );
    }
    html = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `ページ取得に失敗しました: ${msg}` }, { status: 502 });
  }

  const pageText = htmlToText(html);

  // 2) AI抽出
  let extracted;
  try {
    extracted = await extractAdmissions(pageText, { universityName, sourceUrl }, session.user.id);
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string };
    const status = err.statusCode ?? 500;
    return NextResponse.json(
      { error: `AI抽出に失敗しました (status=${status}): ${err.message ?? "unknown"}` },
      { status: status === 402 || status === 429 ? status : 502 }
    );
  }

  const uniName = (universityName || extracted.university.name || "").trim();
  if (!uniName) {
    return NextResponse.json(
      { error: "大学名を特定できませんでした。大学名を明示して再実行してください。" },
      { status: 422 }
    );
  }

  // 3) 大学マスタ upsert
  const existingUni = await prisma.university.findUnique({ where: { name: uniName } });
  const university = existingUni
    ? await prisma.university.update({
        where: { id: existingUni.id },
        data: {
          prefecture: prefectureHint || extracted.university.prefecture || existingUni.prefecture,
          category: categoryHint || extracted.university.category || existingUni.category,
          website: existingUni.website || `${parsed.protocol}//${parsed.host}`,
        },
      })
    : await prisma.university.create({
        data: {
          name: uniName,
          prefecture: prefectureHint || extracted.university.prefecture,
          category: categoryHint || extracted.university.category,
          website: `${parsed.protocol}//${parsed.host}`,
        },
      });

  // 4) 入試情報を差分検知しながら upsert
  const now = new Date();
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const changes: { faculty: string; method: string; type: "新規" | "更新" | "変更なし"; summary?: string }[] = [];

  for (const a of extracted.admissions) {
    const hash = admissionHash(a);
    const existing = await prisma.universityAdmission.findFirst({
      where: {
        universityId: university.id,
        faculty: a.faculty,
        department: a.department,
        method: a.method,
        targetYear: a.targetYear,
      },
    });

    if (!existing) {
      await prisma.universityAdmission.create({
        data: {
          universityId: university.id,
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
          sourceUrl,
          contentHash: hash,
          lastCrawledAt: now,
        },
      });
      created++;
      changes.push({ faculty: a.faculty, method: a.method, type: "新規" });
    } else if (existing.contentHash !== hash) {
      const before = {
        examDate: existing.examDate,
        applicationPeriod: existing.applicationPeriod,
        subjects: existing.subjects,
        capacity: existing.capacity,
        deviationTarget: existing.deviationTarget,
        examFee: existing.examFee,
      };
      const after = {
        examDate: a.examDate,
        applicationPeriod: a.applicationPeriod,
        subjects: a.subjects,
        capacity: a.capacity,
        deviationTarget: a.deviationTarget,
        examFee: a.examFee,
      };
      const changedFields = (Object.keys(after) as (keyof typeof after)[]).filter(
        (k) => String(before[k] ?? "") !== String(after[k] ?? "")
      );
      const summary = `${a.faculty || "(学部不明)"} ${a.method || ""}: ${changedFields.join(", ")} が変更`;
      await prisma.universityAdmission.update({
        where: { id: existing.id },
        data: {
          examDate: a.examDate,
          applicationPeriod: a.applicationPeriod,
          subjects: a.subjects,
          capacity: a.capacity,
          deviationTarget: a.deviationTarget,
          examFee: a.examFee,
          sourceUrl,
          contentHash: hash,
          lastCrawledAt: now,
        },
      });
      await prisma.admissionRevision.create({
        data: {
          admissionId: existing.id,
          summary,
          diff: JSON.stringify({ before, after, changedFields }),
          sourceUrl,
        },
      });
      updated++;
      changes.push({ faculty: a.faculty, method: a.method, type: "更新", summary });
    } else {
      await prisma.universityAdmission.update({
        where: { id: existing.id },
        data: { lastCrawledAt: now },
      });
      unchanged++;
      changes.push({ faculty: a.faculty, method: a.method, type: "変更なし" });
    }
  }

  return NextResponse.json({
    university: { id: university.id, name: university.name },
    sourceUrl,
    extractedCount: extracted.admissions.length,
    created,
    updated,
    unchanged,
    changes,
  });
}
