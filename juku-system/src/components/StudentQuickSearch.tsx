"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentSearchSelect from "./StudentSearchSelect";

type StudentLite = { id: string; name: string; schoolName?: string };

/**
 * 生徒名で検索する候補プルダウン。
 * 候補をクリックすると生徒詳細(/students/[id])へ遷移する。
 */
export default function StudentQuickSearch() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    fetch("/api/students-list")
      .then((r) => r.json())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleChange = (id: string) => {
    setValue(id);
    if (id) {
      router.push(`/students/${id}`);
    }
  };

  return (
    <StudentSearchSelect
      students={students.map((s) => ({ id: s.id, name: s.name, hint: s.schoolName }))}
      value={value}
      onChange={handleChange}
      placeholder="生徒名で検索 → 詳細へジャンプ"
    />
  );
}
