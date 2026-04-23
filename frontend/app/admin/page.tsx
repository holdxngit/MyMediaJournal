"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "../Nav";
import { getApiBaseUrl } from "../api";

type User = {
  user_id: number;
  name: string | null;
  email: string;
  friend_code: string | null;
  created_at: string | null;
  avatar_url: string | null;
  role: string | null;
};

type Genre = {
  genre_id: number;
  title: string;
};

type MediaItemEntry = {
  title: string;
  media_type: string;
  genres: number[];
};

type ImportResult = {
  imported: number;
  skipped: number;
};

const EXAMPLE_JSON = `[
  {
    "title": "Parasite",
    "media_type": "Movie",
    "genres": [1, 5]
  },
  {
    "title": "Shogun",
    "media_type": "Show",
    "genres": [3, 9]
  }
]`;

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const apiBase = getApiBaseUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState("");
  const [preview, setPreview] = useState<MediaItemEntry[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function load() {
      const [meRes, genresRes] = await Promise.all([
        fetch(`${apiBase}/auth/me`, { credentials: "include" }),
        fetch(`${apiBase}/genres/full`, { credentials: "include" }),
      ]);
      if (!meRes.ok) { router.push("/login"); return; }
      const me: User = await meRes.json();
      if (me.role !== "admin") { router.push("/"); return; }
      setUser(me);
      if (genresRes.ok) setGenres(await genresRes.json());
      setLoading(false);
    }
    load();
  }, []);

  function handleParse() {
    setParseError("");
    setResult(null);
    setSubmitError("");
    try {
      const parsed = JSON.parse(jsonText.trim());
      if (!Array.isArray(parsed)) {
        setParseError("JSON must be an array of objects.");
        return;
      }
      const validated: MediaItemEntry[] = [];
      for (const item of parsed) {
        if (typeof item.title !== "string" || !item.title.trim()) {
          setParseError(`Each item must have a non-empty "title" string.`);
          return;
        }
        if (typeof item.media_type !== "string" || !item.media_type.trim()) {
          setParseError(`Each item must have a "media_type" string.`);
          return;
        }
        const genres = Array.isArray(item.genres) ? item.genres.filter((g: unknown) => typeof g === "number") : [];
        validated.push({ title: item.title.trim(), media_type: item.media_type.trim(), genres });
      }
      if (validated.length === 0) {
        setParseError("Array is empty — nothing to import.");
        return;
      }
      setPreview(validated);
    } catch {
      setParseError("Invalid JSON. Please check the syntax.");
    }
  }

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonText(text);
      setPreview(null);
      setResult(null);
      setParseError("");
      setSubmitError("");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!preview || preview.length === 0) return;
    setSubmitting(true);
    setSubmitError("");
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/admin/media-items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preview),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.detail || "Import failed.");
        return;
      }
      const data: ImportResult = await res.json();
      setResult(data);
      setPreview(null);
      setJsonText("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClear() {
    setJsonText("");
    setPreview(null);
    setParseError("");
    setSubmitError("");
    setResult(null);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08080f]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#08080f]">
      {user && <Nav user={user} onLogout={async () => {
        await fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include" });
        router.push("/login");
      }} onUserUpdate={setUser} />}

      <main className="ml-56 flex-1 px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
              Admin
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white">Media Import</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Bulk-add new media items to the catalog
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Left: input panel */}
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/[0.1]"
              >
                <UploadIcon />
                Load JSON file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileLoad}
              />
              {(jsonText || preview) && (
                <button
                  onClick={handleClear}
                  className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-gray-500 transition hover:text-gray-300"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setPreview(null);
                  setParseError("");
                  setResult(null);
                  setSubmitError("");
                }}
                placeholder={EXAMPLE_JSON}
                rows={16}
                spellCheck={false}
                className="w-full resize-y rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 font-mono text-xs text-gray-300 outline-none placeholder:text-gray-700 focus:border-violet-500/50"
              />
            </div>

            {parseError && (
              <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                {parseError}
              </p>
            )}

            {/* Action buttons */}
            {!preview ? (
              <button
                onClick={handleParse}
                disabled={!jsonText.trim()}
                className="rounded-xl bg-white/[0.07] px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Preview import
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {submitting ? "Importing…" : `Import ${preview.length} item${preview.length !== 1 ? "s" : ""}`}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="text-sm text-gray-500 transition hover:text-gray-300"
                >
                  Back to edit
                </button>
              </div>
            )}

            {submitError && (
              <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                {submitError}
              </p>
            )}

            {result && (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                <CheckCircleIcon />
                <span>
                  <strong>{result.imported}</strong> imported,{" "}
                  <strong>{result.skipped}</strong> skipped (already exist)
                </span>
              </div>
            )}

            {/* Preview table */}
            {preview && preview.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Title</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Type</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Genres</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item, i) => (
                      <tr key={i} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-4 py-2.5 text-gray-200">{item.title}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-300">
                            {item.media_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {item.genres.length > 0
                            ? item.genres.map((id) => {
                                const g = genres.find((g) => g.genre_id === id);
                                return g ? g.title : `#${id}`;
                              }).join(", ")
                            : <span className="text-gray-700">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: reference panel */}
          <div className="space-y-4">
            {/* Format guide */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                JSON Format
              </p>
              <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-[11px] leading-relaxed text-gray-400">{`[
  {
    "title": "string",
    "media_type": "Movie|Show|
      Anime|Game|Book|Manga",
    "genres": [1, 2, 3]
  }
]`}</pre>
              <p className="mt-2 text-[11px] text-gray-600">
                <code className="text-gray-500">genres</code> is a list of genre IDs (see below). Items with a duplicate title + type are skipped.
              </p>
            </div>

            {/* Genre reference */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                Genre IDs
              </p>
              <div className="space-y-1">
                {genres.map((g) => (
                  <div key={g.genre_id} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{g.title}</span>
                    <span className="font-mono text-xs text-gray-600">{g.genre_id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
