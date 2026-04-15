"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StudentSearchSelect from "@/components/StudentSearchSelect";

type User = { id: string; name: string; role: string; userId: string };

export default function AdminAlertForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general");
  const [audience, setAudience] = useState("all_users");
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [targetRole, setTargetRole] = useState<"student" | "teacher">("student");
  const [targetUserId, setTargetUserId] = useState(""); // users.id
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/students").then((r) => r.ok ? r.json() : []),
      fetch("/api/teachers").then((r) => r.ok ? r.json() : []),
    ]).then(([ss, ts]) => {
      if (Array.isArray(ss)) setStudents(ss.map((s: { id: string; userId: string; user: { name: string } }) => ({ id: s.id, userId: s.userId, name: s.user.name, role: "student" })));
      if (Array.isArray(ts)) setTeachers(ts.map((t: { id: string; userId: string; user: { name: string } }) => ({ id: t.id, userId: t.userId, name: t.user.name, role: "teacher" })));
    });
  }, [open]);

  const reset = () => {
    setTitle(""); setMessage(""); setType("general");
    setAudience("all_users"); setTargetUserId(""); setTargetRole("student");
    setMsg("");
  };
  const close = () => { setOpen(false); reset(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const body: Record<string, unknown> = { title, message, type, audience };
    if (audience === "specific") {
      if (!targetUserId) { setMsg("対象ユーザーを選択してください"); setBusy(false); return; }
      body.userIds = [targetUserId];
    }
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`${data.sent}人に送信しました`);
      router.refresh();
      setTimeout(close, 1000);
    } else {
      setMsg(data.error || "失敗しました");
    }
    setBusy(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark">
        アラート送信
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">アラートを送信</h3>
              <button onClick={close} className="text-dark/60 hover:text-dark">✕</button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-charcoal">対象</label>
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="all_users">全員（生徒＋講師）</option>
                  <option value="all_students">生徒全員</option>
                  <option value="all_teachers">講師全員</option>
                  <option value="specific">特定の1名</option>
                </select>
              </div>
              {audience === "specific" && (
                <div className="bg-surface rounded p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm">ロール:</label>
                    <label className="text-sm"><input type="radio" checked={targetRole === "student"} onChange={() => { setTargetRole("student"); setTargetUserId(""); }} /> 生徒</label>
                    <label className="text-sm"><input type="radio" checked={targetRole === "teacher"} onChange={() => { setTargetRole("teacher"); setTargetUserId(""); }} /> 講師</label>
                  </div>
                  <StudentSearchSelect
                    students={(targetRole === "student" ? students : teachers).map((u) => ({ id: u.userId, name: u.name }))}
                    value={targetUserId}
                    onChange={setTargetUserId}
                    placeholder={`${targetRole === "student" ? "生徒" : "講師"}名で検索`}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-charcoal">種別</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="general">一般</option>
                  <option value="task_overdue">期限超過</option>
                  <option value="shift_reminder">シフト</option>
                  <option value="progress_warning">進捗警告</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">タイトル</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">本文</label>
                <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              {msg && <p className="text-sm text-dark/70">{msg}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={close} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">キャンセル</button>
                <button type="submit" disabled={busy} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
                  {busy ? "送信中..." : "送信"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
