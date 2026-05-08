import { requireAuth } from "@/lib/session";
import BackupClient from "./BackupClient";

export default async function BackupPage() {
  await requireAuth(["admin"]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">バックアップ</h1>
      <BackupClient />
    </div>
  );
}
