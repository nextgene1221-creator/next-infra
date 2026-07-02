import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TRACKS, GENDERS } from "@/lib/types";
import LineLinkSection from "./LineLinkSection";

export default async function ProfilePage() {
  const session = await requireAuth();
  const userId = session.user.id;
  const role = session.user.role;
  const roleLabel = role === "admin" ? "管理者" : role === "teacher" ? "講師" : "生徒";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teacher: true,
      student: true,
    },
  });

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark mb-6">プロフィール</h1>
        <p className="text-dark/70">ユーザー情報が見つかりません。</p>
      </div>
    );
  }

  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString("ja-JP") : "-";

  const employmentLabel = (v: string) =>
    v === "full_time" ? "常勤" : v === "part_time" ? "非常勤" : v;
  const statusLabel = (v: string) =>
    v === "active" ? "稼働中" : v === "inactive" ? "非稼働" : v === "withdrawn" ? "退塾" : v;
  const trackLabel = (v: string) => TRACKS.find((t) => t.value === v)?.label || (v ? v : "-");
  const genderLabel = (v: string) => GENDERS.find((g) => g.value === v)?.label || (v ? v : "-");

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">プロフィール</h1>
        <span className="text-xs text-dark/60">※ 編集はできません。変更がある場合は運営にご連絡ください。</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          <Row label="氏名" value={user.name} />
          <Row label="メール" value={user.email} />
          <Row label="ロール" value={roleLabel} />
          <Row label="登録日" value={fmtDate(user.createdAt)} />
        </div>

        <LineLinkSection initialLinked={!!user.lineUserId} />

        {user.teacher && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">講師情報</h2>
            <Row label="電話番号" value={user.teacher.phone || "-"} />
            <Row label="緊急連絡先" value={user.teacher.emergencyContact || "-"} />
            <Row label="雇用形態" value={employmentLabel(user.teacher.employmentType)} />
            <Row label="ステータス" value={statusLabel(user.teacher.status)} />
            <Row
              label="担当可能科目"
              value={renderJsonArray(user.teacher.subjects) || "-"}
            />
            <Row label="大学学部" value={user.teacher.universityFaculty || "-"} />
            <Row label="学科" value={user.teacher.department || "-"} />
            <Row
              label="卒業年度"
              value={user.teacher.graduationYear ? `${user.teacher.graduationYear}年` : "-"}
            />
            <Row
              label="受験した科目"
              value={renderJsonArray(user.teacher.examSubjectsTaken) || "-"}
            />
            <Row label="大学での部活" value={user.teacher.universityClub || "-"} />
          </div>
        )}

        {user.student && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">生徒情報</h2>
            <Row label="ふりがな" value={user.student.furigana || "-"} />
            <Row label="性別" value={genderLabel(user.student.gender)} />
            <Row label="生年月日" value={fmtDate(user.student.birthDate)} />
            <Row label="高校名" value={user.student.schoolName} />
            <Row label="卒業年度" value={`${user.student.graduationYear}年`} />
            <Row label="携帯電話番号" value={user.student.mobilePhone || "-"} />
            <Row label="郵便番号" value={user.student.postalCode || "-"} />
            <Row label="住所" value={user.student.address || "-"} />
            <Row label="入塾校舎" value={user.student.campus || "-"} />
            <Row label="塾の紹介者" value={user.student.referrer || "-"} />
            <Row label="文理" value={trackLabel(user.student.track)} />
            <Row label="第1志望校" value={user.student.firstChoiceSchool || "-"} />
            <Row label="志望する学部系統" value={user.student.desiredFaculty || "-"} />
            <Row
              label="受験科目"
              value={renderJsonArray(user.student.examSubjects) || "-"}
            />
            <Row
              label="総合・推薦の検討"
              value={user.student.considerRecommendation ? "あり" : "なし"}
            />
            <Row label="英検受験予定" value={user.student.eikenPlan || "-"} />
            <Row label="入塾日" value={fmtDate(user.student.enrollmentDate)} />
            <Row label="ステータス" value={statusLabel(user.student.status)} />
            <Row label="保護者氏名" value={user.student.parentName} />
            <Row label="保護者電話番号" value={user.student.parentPhone} />
            <Row label="保護者メール" value={user.student.parentEmail} />
            {user.student.notes && (
              <Row label="備考" value={user.student.notes} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex py-1.5">
      <dt className="w-32 shrink-0 text-sm text-dark/60">{label}</dt>
      <dd className="text-sm text-dark whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function renderJsonArray(raw: string): string {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.join("、");
  } catch {
    /* ignore */
  }
  return raw;
}
