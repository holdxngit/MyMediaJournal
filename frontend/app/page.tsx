"use client";

import Link from "next/link";
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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Journal edit state
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editLog, setEditLog] = useState({ dateConsumed: "", timeConsumed: 0 });

  // New Item modal state
  const [showModal, setShowModal] = useState(false);
  const [modalCatalog, setModalCatalog] = useState<MediaItem[]>([]);
  const [modalSearch, setModalSearch] = useState("");
  const [modalMediaType, setModalMediaType] = useState("");
  const [modalGenre, setModalGenre] = useState("");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [logForm, setLogForm] = useState({ dateConsumed: "", timeHours: "", timeMinutes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/logs?user_id=${DEMO_USER_ID}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      setLogs(await res.json());
    } catch {
      setError("Could not load journal entries.");
    }
  }, []);

  const fetchModalCatalog = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (modalMediaType) params.set("media_type", modalMediaType);
      if (modalGenre) params.set("genre", modalGenre);
      const qs = params.toString();
      const res = await fetch(`${API_BASE_URL}/media${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      setModalCatalog(await res.json());
    } catch {
      setModalError("Could not load media catalog.");
    }
  }, [modalMediaType, modalGenre]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [genresRes] = await Promise.all([
          fetch(`${API_BASE_URL}/genres`),
          fetchLogs(),
        ]);
        if (genresRes.ok) setGenres(await genresRes.json());
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchLogs]);

  useEffect(() => {
    if (showModal) fetchModalCatalog();
  }, [showModal, fetchModalCatalog]);

  const openModal = () => {
    setShowModal(true);
    setSelectedItem(null);
    setModalSearch("");
    setModalMediaType("");
    setModalGenre("");
    setLogForm({ dateConsumed: "", timeHours: "", timeMinutes: "" });
    setModalError("");
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setModalError("");
  };

  const filteredCatalog = modalCatalog.filter((item) =>
    item.title.toLowerCase().includes(modalSearch.toLowerCase())
  );

  const handleLogSubmit = async () => {
    if (!selectedItem) {
      setModalError("Select an item from the list.");
      return;
    }
    if (!logForm.dateConsumed) {
      setModalError("Please fill in the date.");
      return;
    }
    const hours = parseInt(logForm.timeHours) || 0;
    const minutes = parseInt(logForm.timeMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) {
      setModalError("Time consumed must be at least 1 minute.");
      return;
    }

    try {
      setSubmitting(true);
      setModalError("");
      const res = await fetch(`${API_BASE_URL}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: DEMO_USER_ID,
          media_id: selectedItem.media_id,
          date_consumed: logForm.dateConsumed,
          time_consumed: totalMinutes,
        }),
      });
      if (!res.ok) throw new Error();
      const created: LogEntry = await res.json();
      setLogs((prev) => [created, ...prev]);
      closeModal();
    } catch {
      setModalError("Could not save log entry.");
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h1 className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
      Media Journal
    </h1>
    <p className="mt-2 text-gray-400">Track what you&apos;ve watched, played, or read.</p>
  </div>

  <div className="flex gap-3">
    <Link
      href="/login"
      className="rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white transition hover:border-violet-500 hover:bg-[#23233a]"
    >
      Login
    </Link>
    <Link
      href="/signup"
      className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/30"
    >
      Sign Up
    </Link>
  </div>
</div>

        {error && (
          <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* My Journal */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(139,92,246,0.1)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Journal</h2>
            <div className="flex gap-3">
              <button
                onClick={fetchLogs}
                className="rounded-lg bg-[#1a1a2e] px-4 py-2 text-sm text-violet-200 transition hover:bg-[#23233a]"
              >
                Refresh
              </button>
              <button
                onClick={openModal}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/30"
              >
                + New Item
              </button>
            </div>
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
                      No journal entries yet. Click &quot;+ New Item&quot; to log something.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* New Item Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-violet-500/30 bg-[#0f0f1a] shadow-[0_0_60px_rgba(139,92,246,0.2)]"
            style={{ maxHeight: "90vh" }}
          >
            {/* Modal Header */}
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="text-xl font-semibold">Add New Entry</h2>
              <p className="mt-1 text-sm text-gray-400">Search the catalog and pick something to log.</p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap gap-3 border-b border-white/10 px-6 py-4">
              <input
                type="text"
                placeholder="Search by title..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className={`flex-1 min-w-[160px] ${inputClass}`}
              />
              <select
                value={modalMediaType}
                onChange={(e) => { setModalMediaType(e.target.value); setSelectedItem(null); }}
                className={inputClass}
              >
                <option value="">All Types</option>
                {MEDIA_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={modalGenre}
                onChange={(e) => { setModalGenre(e.target.value); setSelectedItem(null); }}
                className={inputClass}
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Catalog List */}
            <div className="overflow-y-auto px-6 py-2" style={{ maxHeight: "300px" }}>
              {filteredCatalog.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No items match.</p>
              ) : (
                filteredCatalog.map((item) => (
                  <button
                    key={item.media_id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                      selectedItem?.media_id === item.media_id
                        ? "bg-violet-600/30 border border-violet-500/50 text-white"
                        : "border border-transparent text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-medium">{item.title}</span>
                    <span className="ml-2 text-gray-400">{item.media_type}</span>
                    {item.genres.length > 0 && (
                      <span className="ml-2 text-violet-400 text-xs">
                        {item.genres.join(", ")}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Log Form */}
            <div className="border-t border-white/10 px-6 py-4">
              {selectedItem && (
                <p className="mb-3 text-sm text-gray-400">
                  Selected:{" "}
                  <span className="font-medium text-violet-300">{selectedItem.title}</span>
                </p>
              )}

              {modalError && (
                <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {modalError}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <input
                  type="date"
                  value={logForm.dateConsumed}
                  onChange={(e) => setLogForm((p) => ({ ...p, dateConsumed: e.target.value }))}
                  className={`flex-1 min-w-[160px] ${inputClass}`}
                />
                <input
                  type="number"
                  placeholder="Hours"
                  min="0"
                  value={logForm.timeHours}
                  onChange={(e) => setLogForm((p) => ({ ...p, timeHours: e.target.value }))}
                  className={`w-28 ${inputClass}`}
                />
                <input
                  type="number"
                  placeholder="Minutes"
                  min="0"
                  value={logForm.timeMinutes}
                  onChange={(e) => setLogForm((p) => ({ ...p, timeMinutes: e.target.value }))}
                  className={`w-28 ${inputClass}`}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 border-t border-white/10 px-6 py-4">
              <button
                onClick={handleLogSubmit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-medium text-white transition hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save Entry"}
              </button>
              <button
                onClick={closeModal}
                className="rounded-xl border border-white/10 px-5 py-3 text-gray-400 transition hover:border-white/30 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
