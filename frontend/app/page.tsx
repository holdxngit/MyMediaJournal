"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";
const DEMO_USER_ID = 1;

type MediaItem = {
  media_id: number;
  title: string;
  media_type: string;
  genres: string[];
};

type LogEntry = {
  log_id: number;
  user_id: number;
  media_id: number;
  title: string;
  media_type: string;
  date_consumed: string;
  time_consumed: number;
};

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

const inputClass =
  "rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30";

const MEDIA_TYPES = ["Movie", "Show", "Anime", "Game", "Book", "Manga", "Other"];

export default function Home() {
  const [catalog, setCatalog] = useState<MediaItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [mediaTypeFilter, setMediaTypeFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [loggingItem, setLoggingItem] = useState<MediaItem | null>(null);
  const [logForm, setLogForm] = useState({
    dateConsumed: "",
    timeHours: "",
    timeMinutes: "",
  });
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editLog, setEditLog] = useState({ dateConsumed: "", timeConsumed: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchCatalog = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (mediaTypeFilter) params.set("media_type", mediaTypeFilter);
      if (genreFilter) params.set("genre", genreFilter);
      const qs = params.toString();
      const res = await fetch(`${API_BASE_URL}/media${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      setCatalog(await res.json());
    } catch {
      setError("Could not load media catalog.");
    }
  }, [mediaTypeFilter, genreFilter]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/logs?user_id=${DEMO_USER_ID}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error();
      setLogs(await res.json());
    } catch {
      setError("Could not load journal entries.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/genres`);
        if (res.ok) setGenres(await res.json());
        await Promise.all([fetchCatalog(), fetchLogs()]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchCatalog, fetchLogs]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleLogSubmit = async () => {
    if (!loggingItem || !logForm.dateConsumed) {
      setError("Please fill in the date.");
      return;
    }
    const hours = parseInt(logForm.timeHours) || 0;
    const minutes = parseInt(logForm.timeMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) {
      setError("Time consumed must be at least 1 minute.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: DEMO_USER_ID,
          media_id: loggingItem.media_id,
          date_consumed: logForm.dateConsumed,
          time_consumed: totalMinutes,
        }),
      });
      if (!res.ok) throw new Error();
      const created: LogEntry = await res.json();
      setLogs((prev) => [created, ...prev]);
      setLoggingItem(null);
      setLogForm({ dateConsumed: "", timeHours: "", timeMinutes: "" });
    } catch {
      setError("Could not log media item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editLog.dateConsumed || editLog.timeConsumed <= 0) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      setError("");
      const res = await fetch(`${API_BASE_URL}/logs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_consumed: editLog.dateConsumed,
          time_consumed: editLog.timeConsumed,
        }),
      });
      if (!res.ok) throw new Error();
      const updated: LogEntry = await res.json();
      setLogs((prev) => prev.map((l) => (l.log_id === id ? updated : l)));
      setEditingLogId(null);
    } catch {
      setError("Could not update log entry.");
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      setError("");
      const res = await fetch(`${API_BASE_URL}/logs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLogs((prev) => prev.filter((l) => l.log_id !== id));
      if (editingLogId === id) setEditingLogId(null);
    } catch {
      setError("Could not delete log entry.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a12] text-gray-400">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0f0f1a] to-[#15152a] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
            Media Journal
          </h1>
          <p className="mt-2 text-gray-400">Browse the catalog and log what you've watched, played, or read.</p>
        </div>

        {error && !loggingItem && (
          <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* Catalog */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(139,92,246,0.1)] backdrop-blur-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Media Catalog</h2>
            <div className="flex flex-wrap gap-3">
              <select
                value={mediaTypeFilter}
                onChange={(e) => { setMediaTypeFilter(e.target.value); setError(""); }}
                className={inputClass}
              >
                <option value="">All Types</option>
                {MEDIA_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={genreFilter}
                onChange={(e) => { setGenreFilter(e.target.value); setError(""); }}
                className={inputClass}
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {(mediaTypeFilter || genreFilter) && (
                <button
                  onClick={() => { setMediaTypeFilter(""); setGenreFilter(""); }}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-400 transition hover:border-white/30 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-xl">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-sm uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Genres</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr
                    key={item.media_id}
                    className="border-b border-white/5 text-sm text-gray-200 transition hover:bg-white/5"
                  >
                    <td className="px-4 py-4 font-medium">{item.title}</td>
                    <td className="px-4 py-4">{item.media_type}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.genres.map((g) => (
                          <span
                            key={g}
                            className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => {
                          setLoggingItem(item);
                          setLogForm({ dateConsumed: "", timeHours: "", timeMinutes: "" });
                          setError("");
                        }}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white transition hover:bg-violet-500"
                      >
                        Log It
                      </button>
                    </td>
                  </tr>
                ))}
                {catalog.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No items match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Log Modal */}
        {loggingItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setLoggingItem(null); setError(""); } }}
          >
            <div className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-[#0f0f1a] p-6 shadow-[0_0_60px_rgba(139,92,246,0.2)]">
              <h2 className="mb-1 text-xl font-semibold">Log Entry</h2>
              <p className="mb-5 text-sm text-gray-400">
                Logging: <span className="text-violet-300">{loggingItem.title}</span>
              </p>

              {error && (
                <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3">
                <input
                  type="date"
                  value={logForm.dateConsumed}
                  onChange={(e) => setLogForm((p) => ({ ...p, dateConsumed: e.target.value }))}
                  className={`w-full ${inputClass}`}
                />
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Hours"
                    min="0"
                    value={logForm.timeHours}
                    onChange={(e) => setLogForm((p) => ({ ...p, timeHours: e.target.value }))}
                    className={`w-1/2 ${inputClass}`}
                  />
                  <input
                    type="number"
                    placeholder="Minutes"
                    min="0"
                    value={logForm.timeMinutes}
                    onChange={(e) => setLogForm((p) => ({ ...p, timeMinutes: e.target.value }))}
                    className={`w-1/2 ${inputClass}`}
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleLogSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-medium text-white transition hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Save Entry"}
                </button>
                <button
                  onClick={() => { setLoggingItem(null); setError(""); }}
                  className="rounded-xl border border-white/10 px-5 py-3 text-gray-400 transition hover:border-white/30 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Journal */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(139,92,246,0.1)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Journal</h2>
            <button
              onClick={fetchLogs}
              className="rounded-lg bg-[#1a1a2e] px-4 py-2 text-sm text-violet-200 transition hover:bg-[#23233a]"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-xl">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-sm uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.log_id}
                    className="border-b border-white/5 text-sm text-gray-200 transition hover:bg-white/5"
                  >
                    {editingLogId === log.log_id ? (
                      <>
                        <td className="px-4 py-4 font-medium text-gray-400">{log.title}</td>
                        <td className="px-4 py-4 text-gray-400">{log.media_type}</td>
                        <td className="px-4 py-4">
                          <input
                            type="date"
                            value={editLog.dateConsumed}
                            onChange={(e) => setEditLog((p) => ({ ...p, dateConsumed: e.target.value }))}
                            className="rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-white outline-none focus:border-violet-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="Hrs"
                              value={Math.floor(editLog.timeConsumed / 60)}
                              onChange={(e) => {
                                const h = parseInt(e.target.value) || 0;
                                const m = editLog.timeConsumed % 60;
                                setEditLog((p) => ({ ...p, timeConsumed: h * 60 + m }));
                              }}
                              className="w-16 rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-white outline-none focus:border-violet-500"
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Min"
                              value={editLog.timeConsumed % 60}
                              onChange={(e) => {
                                const m = parseInt(e.target.value) || 0;
                                const h = Math.floor(editLog.timeConsumed / 60);
                                setEditLog((p) => ({ ...p, timeConsumed: h * 60 + m }));
                              }}
                              className="w-16 rounded-lg border border-white/10 bg-[#1a1a2e] px-3 py-2 text-white outline-none focus:border-violet-500"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(log.log_id)}
                              className="rounded-lg bg-violet-600 px-3 py-2 text-white transition hover:bg-violet-500"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingLogId(null)}
                              className="rounded-lg bg-gray-700 px-3 py-2 text-white transition hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4 font-medium">{log.title}</td>
                        <td className="px-4 py-4">{log.media_type}</td>
                        <td className="px-4 py-4">{log.date_consumed}</td>
                        <td className="px-4 py-4">{formatDuration(log.time_consumed)}</td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingLogId(log.log_id);
                                setEditLog({
                                  dateConsumed: log.date_consumed,
                                  timeConsumed: log.time_consumed,
                                });
                              }}
                              className="rounded-lg bg-violet-600 px-3 py-2 text-white transition hover:bg-violet-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLog(log.log_id)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-white transition hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No journal entries yet. Log something from the catalog above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
