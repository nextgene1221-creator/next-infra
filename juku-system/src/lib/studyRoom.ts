export const CAMPUSES = [
  { value: "shuri", label: "首里校舎" },
  { value: "naha", label: "那覇校舎" },
] as const;

export const STUDY_ROOM_CAPACITY = 10;

export function campusLabel(v: string): string {
  return CAMPUSES.find((c) => c.value === v)?.label || v;
}
