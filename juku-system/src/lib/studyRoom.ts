import { prisma } from "@/lib/prisma";

export const SEAT_TYPES = [
  { value: "booth", label: "ブース席" },
  { value: "table", label: "テーブル席" },
] as const;

export function seatLabel(v: string): string {
  return SEAT_TYPES.find((s) => s.value === v)?.label || v;
}

export async function getAllCampuses() {
  const existing = await prisma.campus.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (existing.length > 0) return existing;
  // 初回のみ shuri / naha をシード
  await prisma.campus.createMany({
    data: [
      { code: "shuri", label: "首里校舎", closeTime: "21:00", sortOrder: 0 },
      { code: "naha", label: "那覇校舎", closeTime: "21:00", sortOrder: 1 },
    ],
  });
  return prisma.campus.findMany({ orderBy: [{ sortOrder: "asc" }] });
}

export async function campusByCode(code: string) {
  return prisma.campus.findUnique({ where: { code } });
}

export async function campusLabel(code: string): Promise<string> {
  const c = await campusByCode(code);
  return c?.label || code;
}

export async function getOrInitStudyRoomConfig(campus: string) {
  const existing = await prisma.studyRoomConfig.findUnique({ where: { campus } });
  if (existing) return existing;
  return prisma.studyRoomConfig.create({
    data: { campus, boothCapacity: 10, tableCapacity: 0 },
  });
}

export async function getAllStudyRoomConfigs() {
  const campuses = await getAllCampuses();
  return Promise.all(campuses.map((c) => getOrInitStudyRoomConfig(c.code)));
}
