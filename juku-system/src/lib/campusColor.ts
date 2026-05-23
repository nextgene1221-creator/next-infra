// 校舎 code → 色クラス。校舎マスタの sortOrder 順に下記パレットを割当てる。
// 状態色（背景）を潰さないよう、シフトチップでは「左ボーダー帯」として使う。
//
// パレットは Tailwind の JIT が拾えるよう、完全な class 名で定義する必要がある。

const PALETTE = [
  { border: "border-l-blue-500",   dot: "bg-blue-500",   label: "text-blue-700"   }, // 1番目
  { border: "border-l-orange-500", dot: "bg-orange-500", label: "text-orange-700" }, // 2番目
  { border: "border-l-purple-500", dot: "bg-purple-500", label: "text-purple-700" }, // 3番目
  { border: "border-l-teal-500",   dot: "bg-teal-500",   label: "text-teal-700"   }, // 4番目
  { border: "border-l-pink-500",   dot: "bg-pink-500",   label: "text-pink-700"   }, // 5番目以降
];

export type CampusLike = { code: string; label: string; sortOrder?: number };

export function buildCampusColorMap(campuses: CampusLike[]): Record<string, typeof PALETTE[number]> {
  const sorted = [...campuses].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code),
  );
  const map: Record<string, typeof PALETTE[number]> = {};
  sorted.forEach((c, idx) => {
    map[c.code] = PALETTE[idx % PALETTE.length];
  });
  return map;
}

export const EMPTY_CAMPUS_COLOR = {
  border: "border-l-transparent",
  dot: "bg-gray-300",
  label: "text-dark/60",
} as const;
