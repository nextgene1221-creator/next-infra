import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    id: string;
  }
}

export type Role = "admin" | "teacher" | "student";

export const SUBJECTS = [
  "現代文",
  "古文",
  "漢文",
  "英語",
  "数学1A",
  "数学2BC",
  "数学3",
  "生物基礎",
  "生物",
  "化学基礎",
  "化学",
  "物理基礎",
  "物理",
  "地学基礎",
  "地学",
  "公共・政経",
  "公共・倫理",
  "地理",
  "日本史",
  "世界史",
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const TRACKS = [
  { value: "liberal_arts", label: "文系" },
  { value: "science", label: "理系" },
  { value: "both", label: "どちらも" },
] as const;

export const GENDERS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
] as const;
