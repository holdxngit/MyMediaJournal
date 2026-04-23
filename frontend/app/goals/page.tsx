"use client";

import { motion } from "framer-motion";
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

type Priority = "Low" | "Medium" | "High";
type SortKey = "date" | "priority" | "alpha";

type Goal = {
  goal_id: number;
  title: string;
  due_date: string;
  priority: Priority;
  completed: boolean;
};

// ── Icons ──────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <polyline points="3 6 4 7 6 5" />
      <polyline points="3 12 4 13 6 11" />
      <polyline points="3 18 4 19 6 17" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

const PRIORITY_STYLE: Record<Priority, string> = {
  High:   "bg-red-500/15 text-red-400",
  Medium: "bg-amber-500/15 text-amber-400",
  Low:    "bg-white/[0.06] text-gray-500",
};

function isOverdue(due: string, completed: boolean) {
  return !completed && due < new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sortGoals(goals: Goal[], key: SortKey): Goal[] {
  const comparators: Record<SortKey, (a: Goal, b: Goal) => number> = {
    date:     (a, b) => a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0,
    priority: (a, b) => {
      const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return p !== 0 ? p : (a.due_date < b.due_date ? -1 : 1);
    },
    alpha:    (a, b) => a.title.localeCompare(b.title),
  };
  const cmp = comparators[key];
  const incomplete = goals.filter((g) => !g.completed).sort(cmp);
  const complete   = goals.filter((g) =>  g.completed).sort(cmp);
  return [...incomplete, ...complete];
}

// ── Goal row ───────────────────────────────────────────────────────────────────

function GoalRow({
  goal,
  onToggle,
  onDelete,
}: {
  goal: Goal;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const overdue = isOverdue(goal.due_date, goal.completed);

  return (
    <div className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition ${
      goal.completed ? "opacity-50" : "hover:bg-white/[0.03]"
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(goal.goal_id, !goal.completed)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          goal.completed
            ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400"
            : "border-white/20 hover:border-violet-400/60 hover:bg-violet-500/10"
        }`}
      >
        {goal.completed && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span className={`flex-1 text-sm ${
        goal.completed ? "line-through text-gray-600" : "text-gray-200"
      }`}>
        {goal.title}
      </span>

      {/* Priority badge */}
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[goal.priority]}`}>
        {goal.priority}
      </span>

      {/* Due date */}
      <span className={`shrink-0 text-xs tabular-nums ${
        overdue ? "text-red-400" : "text-gray-600"
      }`}>
        {overdue ? "⚠ " : ""}{fmtDate(goal.due_date)}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(goal.goal_id)}
        className="shrink-0 text-gray-700 opacity-0 transition hover:text-gray-400 group-hover:opacity-100"
      >
        <XIcon />
      </button>
    </div>
  );
}

// ── Add form ───────────────────────────────────────────────────────────────────

function AddGoalForm({ onAdd }: { onAdd: (g: Goal) => void }) {
  const apiBase = getApiBaseUrl();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [priority, setPriority] = useState<Priority>("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Add a description first."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/goals`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), due_date: dueDate, priority }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Failed to add goal.");
        return;
      }
      onAdd(await res.json());
      setTitle("");
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-2">
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
        {/* Title */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
          placeholder="Add a goal…"
          className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-600"
        />

        {/* Priority */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className={`rounded-lg px-2 py-1 text-xs font-medium outline-none transition ${PRIORITY_STYLE[priority]} bg-transparent cursor-pointer`}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>

        {/* Date */}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-gray-400 outline-none ring-1 ring-white/[0.08] focus:ring-violet-500/40"
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {error && <p className="mt-1.5 px-1 text-xs text-red-400">{error}</p>}
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const router = useRouter();
  const apiBase = getApiBaseUrl();

  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [meRes, goalsRes] = await Promise.all([
        fetch(`${apiBase}/auth/me`, { credentials: "include" }),
        fetch(`${apiBase}/goals`, { credentials: "include" }),
      ]);
      if (!meRes.ok) { router.push("/login"); return; }
      setUser(await meRes.json());
      if (goalsRes.ok) setGoals(await goalsRes.json());
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    await fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include" });
    router.push("/login");
  }

  async function handleToggle(id: number, completed: boolean) {
    const res = await fetch(`${apiBase}/goals/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) {
      const updated: Goal = await res.json();
      setGoals((prev) => prev.map((g) => (g.goal_id === id ? updated : g)));
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`${apiBase}/goals/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setGoals((prev) => prev.filter((g) => g.goal_id !== id));
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08080f]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const sorted = sortGoals(goals, sortBy);
  const incomplete = sorted.filter((g) => !g.completed);
  const complete = sorted.filter((g) => g.completed);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0f0f1a] to-[#15152a] text-white">
      {user && <Nav user={user} onLogout={handleLogout} onUserUpdate={setUser} />}

      <main className="ml-56 flex-1 px-8 py-10">
        <div className="mx-auto max-w-5xl">

        {/* Header */}
        <motion.div
          className="mb-8 flex items-start justify-between gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-violet-400">Goals</h1>
            <p className="mt-1 text-sm text-gray-400">
              {incomplete.length} remaining{complete.length > 0 ? ` · ${complete.length} done` : ""}
            </p>
          </div>

          {/* Sort controls  */}
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
            {(["date", "priority", "alpha"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  sortBy === key
                    ? "bg-violet-500/20 text-violet-300"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {key === "alpha" ? "A–Z" : key}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <AddGoalForm onAdd={(g) => setGoals((prev) => [...prev, g])} />

          {goals.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-3 py-12 text-center text-gray-700">
              <ChecklistIcon />
              <p className="text-sm text-gray-500">No goals yet — add one above</p>
            </div>
          ) : (
            <div className="mt-2 divide-y divide-white/[0.04]">
              {incomplete.map((g) => (
                <GoalRow key={g.goal_id} goal={g} onToggle={handleToggle} onDelete={handleDelete} />
              ))}

              {complete.length > 0 && (
                <>
                  {incomplete.length > 0 && (
                    <div className="py-2">
                      <p className="px-4 text-[11px] font-semibold uppercase tracking-widest text-gray-700">
                        Completed
                      </p>
                    </div>
                  )}
                  {complete.map((g) => (
                    <GoalRow key={g.goal_id} goal={g} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </>
              )}
            </div>
          )}
        </motion.div>
        </div>
      </main>
    </div>
  );
}
