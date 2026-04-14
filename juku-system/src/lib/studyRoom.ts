import { prisma } from "@/lib/prisma";

export const CAMPUSES = [
  { value: "shuri", label: "首里校舎" },
  { value: "naha", label: "那覇校舎" },
] as const;

export const SEAT_TYPES = [
  { value: "booth", label: "ブース席" },
  { value: "table", label: "テーブル席" },
] as const;

export function campusLabel(v: string): string {
  return CAMPUSES.find((c) => c.value === v)?.label || v;
}
export function seatLabel(v: string): string {
  return SEAT_TYPES.find((s) => s.value === v)?.label || v;
}

export async function getOrInitConfig(campus: string) {
  const existing = await prisma.studyRoomConfig.findUnique({ where: { campus } });
  if (existing) return existing;
  return prisma.studyRoomConfig.create({
    data: { campus, boothCapacity: 10, tableCapacity: 0 },
  });
}

export async function getAllConfigs() {
  const configs = await Promise.all(CAMPUSES.map((c) => getOrInitConfig(c.value)));
  return configs;
}
