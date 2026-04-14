"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ARTICLE_CATEGORIES, AUDIENCE_LABELS } from "@/lib/articles";

type Item = {
  id: string;
  title: string;
  audience: string;
  category: string;
  publishedAt: string;
};

export default function ArticlesList({
  initialArticles,
  initialQuery,
  initialCategory,
}: {
  initialArticles: Item[];
  initialQuery: string;
  initialCategory: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(sp.toString());
    if (q) params.set("q", q); else params.delete("q");
    if (category) params.set("category", category); else params.delete("category");
    router.push(`/articles?${params.toString()}`);
  };

  return (
    <div>
      <form onSubmit={submit} className="bg-white p-4 rounded-lg shadow mb-4 flex gap-2 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="キーワード（タイトル/本文）"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 min-w-[12rem]"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="">全カテゴリ</option>
          {ARTICLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark">検索</button>
      </form>

      {initialArticles.length === 0 ? (
        <p className="text-dark/60 text-sm">該当する記事がありません</p>
      ) : (
        <ul className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {initialArticles.map((a) => (
            <li key={a.id}>
              <Link href={`/articles/${a.id}`} className="block p-4 hover:bg-surface">
                <div className="flex items-center gap-2 mb-1 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">{a.category}</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface text-dark/70">{AUDIENCE_LABELS[a.audience] || a.audience}</span>
                  <span className="text-dark/50">{new Date(a.publishedAt).toLocaleDateString("ja-JP")}</span>
                </div>
                <p className="text-sm font-medium text-dark">{a.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
