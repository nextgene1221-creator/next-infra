"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { marked } from "marked";
import { ARTICLE_CATEGORIES } from "@/lib/articles";

type ImageMeta = { url: string; name: string };

export default function ArticleEditor({
  articleId,
  initial,
}: {
  articleId?: string;
  initial?: {
    title: string;
    body: string;
    audience: string;
    category: string;
    images: ImageMeta[];
    publishedAt: string;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [audience, setAudience] = useState(initial?.audience || "both");
  const [category, setCategory] = useState(initial?.category || "その他");
  const [publishedAt, setPublishedAt] = useState(
    initial?.publishedAt || new Date().toISOString().split("T")[0]
  );
  const [images, setImages] = useState<ImageMeta[]>(initial?.images || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const inputCls = "mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          setImages((prev) => [...prev, { url: data.url, name: data.name }]);
        } else {
          const data = await res.json();
          setError(data.error || "アップロードに失敗しました");
        }
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const insertImageMd = (img: ImageMeta) => {
    setBody((prev) => `${prev}\n\n![${img.name}](${img.url})\n`);
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body_ = { title, body, audience, category, images, publishedAt };
    const url = articleId ? `/api/articles/${articleId}` : "/api/articles";
    const method = articleId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body_),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/articles/${data.id}`);
    } else {
      const d = await res.json();
      setError(d.error || "保存に失敗しました");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-lg shadow p-6 max-w-4xl space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-charcoal">タイトル</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal">対象</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className={inputCls}>
            <option value="both">全員向け</option>
            <option value="student">生徒向け</option>
            <option value="teacher">講師向け</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal">カテゴリ</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {ARTICLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal">公開日</label>
          <input type="date" required value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* 画像アップロード */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-2">画像（複数選択可）</label>
        <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} className="text-sm" />
        {uploading && <span className="ml-2 text-xs text-dark/60">アップロード中...</span>}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            {images.map((img, i) => (
              <div key={i} className="border border-gray-200 rounded p-2">
                <img src={img.url} alt={img.name} className="w-full h-24 object-cover rounded" />
                <p className="text-xs text-dark/60 truncate mt-1">{img.name}</p>
                <div className="flex justify-between mt-1 text-xs">
                  <button type="button" onClick={() => insertImageMd(img)} className="text-primary hover:underline">
                    本文に挿入
                  </button>
                  <button type="button" onClick={() => removeImage(i)} className="text-red-500 hover:underline">
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 本文 */}
      <div>
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-charcoal">本文（マークダウン）</label>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {showPreview ? "編集に戻る" : "プレビュー"}
          </button>
        </div>
        {showPreview ? (
          <div
            className="mt-1 min-h-[18rem] border border-gray-300 rounded-md p-4 text-sm prose prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_img]:my-2 [&_code]:bg-surface [&_code]:px-1 [&_code]:rounded"
            dangerouslySetInnerHTML={{ __html: marked.parse(body, { breaks: true, async: false }) as string }}
          />
        ) : (
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            placeholder="マークダウン記法で記述。例:&#10;# 見出し&#10;**太字** *斜体*&#10;- 箇条書き&#10;[リンク](https://example.com)&#10;![画像](画像URL)"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
          />
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
          {saving ? "保存中..." : articleId ? "更新" : "公開"}
        </button>
        <button type="button" onClick={() => router.back()} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">
          キャンセル
        </button>
      </div>
    </form>
  );
}
