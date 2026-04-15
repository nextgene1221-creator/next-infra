"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TaskLite = {
  id: string;
  title: string;
  studentId: string | null;
  teacherId: string;
  subject: string;
  description: string;
  dueDate: string;
  type: string;
  meetingDateTime: string | null;
};

export default function TeacherTaskList({ tasks }: { tasks: TaskLite[] }) {
  const router = useRouter();
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = tasks.filter((t) => !hidden.has(t.id));

  const complete = async (task: TaskLite) => {
    setCompleting((s) => new Set(s).add(task.id));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: "completed" }),
      });
      if (!res.ok) throw new Error();
      setHidden((s) => new Set(s).add(task.id));
      router.refresh();
    } catch {
      alert("更新に失敗しました");
    } finally {
      setCompleting((s) => {
        const next = new Set(s);
        next.delete(task.id);
        return next;
      });
    }
  };

  if (visible.length === 0) {
    return <p className="text-sm text-dark/60">未完了タスクはありません</p>;
  }

  return (
    <ul className="divide-y divide-gray-200">
      {visible.map((t) => (
        <li key={t.id} className="py-2 flex items-center gap-3">
          <input
            type="checkbox"
            disabled={completing.has(t.id)}
            onChange={() => complete(t)}
            className="w-4 h-4 cursor-pointer"
            aria-label="完了"
          />
          <Link href={`/tasks/${t.id}/edit`} className="text-sm text-dark hover:text-primary truncate">
            {t.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
