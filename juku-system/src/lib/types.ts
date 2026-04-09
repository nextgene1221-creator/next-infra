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
  "数学",
  "英語",
  "国語",
  "物理",
  "化学",
  "生物",
  "日本史",
  "世界史",
  "地理",
] as const;

export type Subject = (typeof SUBJECTS)[number];
