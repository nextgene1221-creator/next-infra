"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  taskId: string;
  initialCompleted: boolean;
  task?: {
    studentId?: string | null;
    teacherId: string;
    subject: string;
    title: string;
    description: string;
    dueDate: string;
    type: string;
    meetingDateTime?: string | null;
  };
};

export default function TaskCompleteCheckbox({ taskId, initialCompleted, task }: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setCompleted(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: next ? "completed" : "pending",
        }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setCompleted(!next);
      alert("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <input
      type="checkbox"
      checked={completed}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      disabled={loading}
      className="w-4 h-4 cursor-pointer"
      aria-label="完了"
    />
  );
}
