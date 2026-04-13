import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { countBothAlertedActiveStudents } from "@/lib/studentAlerts";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ count: 0 });
  }
  const count = await countBothAlertedActiveStudents();
  return NextResponse.json({ count });
}
