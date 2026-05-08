import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = prisma as unknown as Record<string, { findMany?: (args: unknown) => Promise<unknown[]> }>;
  const modelKeys = Object.keys(client).filter(
    (k) => !k.startsWith("$") && !k.startsWith("_") && typeof client[k]?.findMany === "function",
  );

  const data: Record<string, unknown[]> = {};
  for (const key of modelKeys) {
    try {
      data[key] = await client[key].findMany!({});
    } catch (e) {
      data[key] = [{ __error: e instanceof Error ? e.message : String(e) }];
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    schemaModels: modelKeys,
    data,
  };

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="juku-backup-${ts}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
