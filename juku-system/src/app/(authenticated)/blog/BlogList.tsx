"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const AUDIENCE_LABELS: Record<string, string> = {
  student: "生徒向け",
  teacher: "講師向け",
  admin: "運営向け",
  both: "全員向け",
};

type Post = {
  id: string;
  title: string;
  audience: string;
  categoryName: string;
  authorName: string;
  publishedAt: string;
};

export default function BlogList({
  initialPosts,
  categories,
  initialQuery,
  initialCategoryId,
}: {
  initialPosts: Post[];
  categories: { id: string; name: string }[];
  initialQuery: string;
  initialCategoryId: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState(initialCategoryId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(sp.toString());
    if (q) params.set("q", q); else params.delete("q");
    if (categoryId) params.set("categoryId", categoryId); else params.delete("categoryId");
    router.push(`/blog?${params.toString()}`);
  };

  return (
    <div>
      <form onSubmit={submit} className="bg-white p-4 rounded-lg shadow mb-4 flex gap-2 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="キーワード検索"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-[12rem]"
        />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="">全カテゴリ</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit" className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark">検索</button>
      </form>

      {initialPosts.length === 0 ? (
        <p className="text-dark/60 text-sm">該当する記事がありません</p>
      ) : (
        <ul className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {initialPosts.map((p) => (
            <li key={p.id}>
              <Link href={`/blog/${p.id}`} className="block p-4 hover:bg-surface">
                <div className="flex items-center gap-2 mb-1 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">{p.categoryName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface text-dark/70">{AUDIENCE_LABELS[p.audience] || p.audience}</span>
                  <span className="text-dark/50">{new Date(p.publishedAt).toLocaleDateString("ja-JP")}</span>
                  <span className="text-dark/40">by {p.authorName}</span>
                </div>
                <p className="text-sm font-medium text-dark">{p.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
