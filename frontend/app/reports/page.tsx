"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, animate } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getApiBaseUrl } from "../api";
import { Nav } from "../Nav";

// ── Types ─────────────────────────────────────────────────────────────────────

type User = { user_id: number; name: string | null; email: string };
type TypeBreakdown = { media_type: string; count: number; minutes: number };
type ActivityDay = { date: string; count: number };
type TopItem = { title: string; media_type: string; minutes: number };

type WrappedData = {
  total_entries: number;
  total_minutes: number;
  top_media_type: string | null;
  top_item: TopItem | null;
  longest_session_minutes: number;
  type_breakdown: TypeBreakdown[];
  activity_by_day: ActivityDay[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CHART_COLORS = ["#8b5cf6","#a855f7","#6366f1","#c084fc","#7c3aed","#e879f9"];

const PERIODS = [
  { value: "all_time",   label: "All Time"   },
  { value: "this_year",  label: "This Year"  },
  { value: "this_month", label: "This Month" },
] as const;

// ── Animation variants ────────────────────────────────────────────────────────

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function localDateStr(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

function getDisplayRange(period: string): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period === "this_month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end:   new Date(today.getFullYear(), today.getMonth() + 1, 0),
    };
  }
  if (period === "this_year") {
    return { start: new Date(today.getFullYear(), 0, 1), end: today };
  }
  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7 + 1);
  return { start, end: today };
}

type GridCell = { date: Date; count: number; inRange: boolean };

function buildWeeks(map: Map<string, number>, start: Date, end: Date): GridCell[][] {
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const weeks: GridCell[][] = [];
  const cur = new Date(gridStart);
  while (cur <= end) {
    const week: GridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const inRange = cur >= start && cur <= end;
      week.push({ date: new Date(cur), count: inRange ? (map.get(localDateStr(cur)) ?? 0) : -1, inRange });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function cellBg(count: number): string {
  if (count < 0)  return "transparent";
  if (count === 0) return "rgba(255,255,255,0.05)";
  if (count === 1) return "rgba(109,40,217,0.55)";
  if (count <= 3)  return "rgba(124,58,237,0.78)";
  if (count <= 6)  return "rgba(139,92,246,0.92)";
  return "#8b5cf6";
}

// ── Derived stat helpers ──────────────────────────────────────────────────────

function computeStreaks(days: ActivityDay[]) {
  if (!days.length) return { current: 0, longest: 0, activeDays: 0 };

  const dateSet = new Set(days.map((d) => d.date));

  function countBack(startStr: string): number {
    const [y, m, d] = startStr.split("-").map(Number);
    const cur = new Date(y, m - 1, d);
    let n = 0;
    while (dateSet.has(localDateStr(cur))) { n++; cur.setDate(cur.getDate() - 1); }
    return n;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let current = countBack(localDateStr(today));
  if (current === 0) current = countBack(localDateStr(yesterday));

  const sorted = [...dateSet].sort();
  let longest = sorted.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [y, m, d] = sorted[i - 1].split("-").map(Number);
    const next = localDateStr(new Date(y, m - 1, d + 1));
    if (next === sorted[i]) { run++; if (run > longest) longest = run; }
    else run = 1;
  }

  return { current, longest, activeDays: days.length };
}

// ── Animated counter hook ─────────────────────────────────────────────────────

function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return controls.stop;
  }, [target]);
  return value;
}

// ── Card shell ────────────────────────────────────────────────────────────────

function Card({ children, glow, className = "" }: {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className={`rounded-2xl border bg-white/[0.03] p-6 ${
        glow
          ? "border-violet-500/30 shadow-[0_0_40px_rgba(139,92,246,0.12)]"
          : "border-white/[0.08]"
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
      {children}
    </p>
  );
}

// ── Donut chart tooltip ───────────────────────────────────────────────────────

function DonutTooltip({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-white/10 bg-[#12121f] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{name}</p>
      <p className="text-gray-400">{value} {value === 1 ? "entry" : "entries"}</p>
    </div>
  );
}

// ── Activity heatmap ──────────────────────────────────────────────────────────

const CELL = 11;

type HeatTooltip = { date: Date; count: number; x: number; y: number };

function ActivityHeatmap({ days, period }: { days: ActivityDay[]; period: string }) {
  const [tooltip, setTooltip] = useState<HeatTooltip | null>(null);

  const activityMap = new Map(days.map((d) => [d.date, d.count]));
  const { start, end } = getDisplayRange(period);
  const weeks = buildWeeks(activityMap, start, end);

  const monthLabels: (string | null)[] = new Array(weeks.length).fill(null);
  let lastIdx = -4;
  weeks.forEach((week, i) => {
    const first = week.find((c) => c.inRange && c.date.getDate() === 1);
    if (first && i - lastIdx >= 3) { monthLabels[i] = MONTH_SHORT[first.date.getMonth()]; lastIdx = i; }
  });

  return (
    <div>
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-white/10 bg-[#12121f] px-3 py-2 shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: "translate(-50%,-100%)" }}
        >
          <p className="text-xs font-semibold text-white">
            {tooltip.count === 0 ? "No entries" : `${tooltip.count} ${tooltip.count === 1 ? "entry" : "entries"}`}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {tooltip.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      )}

      {/* Month labels */}
      <div className="mb-1 flex gap-[2px] pl-[26px]">
        {weeks.map((_, wi) => (
          <div key={wi} style={{ width: CELL, minWidth: CELL }}>
            {monthLabels[wi] && (
              <span className="text-[9px] leading-none text-gray-500">{monthLabels[wi]}</span>
            )}
          </div>
        ))}
      </div>

      {/* Day labels + grid */}
      <div className="flex">
        <div className="mr-[6px] flex flex-col gap-[2px]">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
            <div key={i} className="flex items-center justify-end" style={{ height: CELL, minHeight: CELL }}>
              <span className="text-[9px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-[2px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className="rounded-[2px] transition-[filter] duration-100 hover:brightness-125"
                    style={{
                      width: CELL, height: CELL, minWidth: CELL, minHeight: CELL,
                      backgroundColor: cellBg(cell.count),
                      cursor: cell.inRange ? "default" : undefined,
                    }}
                    onMouseEnter={cell.inRange ? (e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setTooltip({ date: cell.date, count: cell.count, x: r.left + r.width / 2, y: r.top });
                    } : undefined}
                    onMouseLeave={cell.inRange ? () => setTooltip(null) : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="text-[10px] text-gray-600">Less</span>
        {[0, 1, 2, 4, 7].map((n) => (
          <div key={n} className="rounded-[2px]" style={{ width: CELL, height: CELL, backgroundColor: cellBg(n) }} />
        ))}
        <span className="text-[10px] text-gray-600">More</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Reports() {
  const router     = useRouter();
  const apiBaseUrl = getApiBaseUrl();

  const [user,        setUser]        = useState<User | null>(null);
  const [period,      setPeriod]      = useState("all_time");
  const [data,        setData]        = useState<WrappedData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const handleLogout = async () => {
    await fetch(`${apiBaseUrl}/auth/logout`, { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    fetch(`${apiBaseUrl}/auth/me`, { credentials: "include", cache: "no-store" })
      .then((res) => { if (!res.ok) { router.push("/login"); return null; } return res.json(); })
      .then((u) => { if (u) setUser(u); })
      .finally(() => setPageLoading(false));
  }, [apiBaseUrl, router]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    fetch(`${apiBaseUrl}/logs/wrapped?period=${period}`, { credentials: "include", cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((d) => setData(d))
      .finally(() => setDataLoading(false));
  }, [apiBaseUrl, user, period]);

  // Hooks at top level — animate from 0 whenever the target changes
  const entryCount  = useCountUp(data?.total_entries ?? 0);
  const minuteCount = useCountUp(data?.total_minutes ?? 0);

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a12] text-gray-400">
        Loading...
      </main>
    );
  }

  const maxBreakdown = data?.type_breakdown.length
    ? Math.max(...data.type_breakdown.map((t) => t.count))
    : 1;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0f0f1a] to-[#15152a] text-white">
      <Nav user={user} onLogout={handleLogout} />

      <main className="ml-56 flex-1 px-8 py-10">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <h1 className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
              Wrapped
            </h1>
            <p className="mt-1 text-sm text-gray-400">Your media consumption at a glance.</p>
          </motion.div>

          {/* Period tabs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="mb-8 flex gap-2"
          >
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  period === p.value
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                    : "border border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </motion.div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-24 text-gray-500">Loading...</div>
          ) : !data || data.total_entries === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
              <p className="text-lg">No entries for this period.</p>
              <p className="mt-1 text-sm">Try a different time range or log something first.</p>
            </div>
          ) : (
            /* key re-mounts the grid on period change → stagger re-fires */
            <motion.div
              key={period}
              variants={gridVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4"
            >

              {/* ── Overview (left) ─────────────────────────────────────── */}
              <Card glow>
                <CardLabel>Overview</CardLabel>
                <div className="flex h-full flex-col justify-center gap-8">
                  <div>
                    <p className="text-6xl font-bold tabular-nums tracking-tight text-white">
                      {entryCount}
                    </p>
                    <p className="mt-2 text-sm text-gray-400">Total Entries</p>
                  </div>
                  <div>
                    <p className="text-6xl font-bold tabular-nums tracking-tight text-white">
                      {formatHours(minuteCount)}
                    </p>
                    <p className="mt-2 text-sm text-gray-400">Total Time Logged</p>
                  </div>
                </div>
              </Card>

              {/* ── Top Category (right) ─────────────────────────────────── */}
              <Card>
                <CardLabel>Top Category</CardLabel>
                {data.top_media_type ? (
                  <div className="flex h-full flex-col justify-center">
                    <p className="text-sm text-gray-400">Your most-logged type was</p>
                    <p className="mt-3 bg-gradient-to-br from-violet-300 to-purple-500 bg-clip-text text-6xl font-extrabold leading-none text-transparent">
                      {data.top_media_type}
                    </p>
                    <p className="mt-4 text-sm text-gray-500">
                      {data.type_breakdown.find((t) => t.media_type === data.top_media_type)?.count ?? 0} entries logged
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data</p>
                )}
              </Card>

              {/* ── Sessions (left) ──────────────────────────────────────── */}
              <Card className="flex flex-col">
                <CardLabel>Sessions</CardLabel>
                <div className="flex flex-1 flex-col justify-center gap-7">
                  <div>
                    <p className="text-5xl font-bold tabular-nums text-white">
                      {formatHours(data.longest_session_minutes)}
                    </p>
                    <p className="mt-1.5 text-sm text-gray-400">Longest single session</p>
                  </div>
                  <div>
                    <p className="text-5xl font-bold tabular-nums text-white">
                      {formatHours(Math.round(data.total_minutes / data.total_entries))}
                    </p>
                    <p className="mt-1.5 text-sm text-gray-400">Average per session</p>
                  </div>
                </div>
              </Card>

              {/* ── Donut breakdown (right) ──────────────────────────────── */}
              {data.type_breakdown.length > 0 && (
                <Card>
                  <CardLabel>Breakdown by Type</CardLabel>

                  {/* Donut */}
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={data.type_breakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={54}
                          outerRadius={82}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="media_type"
                          animationBegin={150}
                          animationDuration={900}
                        >
                          {data.type_breakdown.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} cursor={false} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centre label */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xl font-bold text-white">{data.total_entries}</p>
                      <p className="text-[10px] text-gray-500">total</p>
                    </div>
                  </div>

                  {/* Legend + bars */}
                  <div className="mt-2 space-y-2.5">
                    {data.type_breakdown.map((row, i) => (
                      <div key={row.media_type}>
                        <div className="mb-1 flex items-center gap-2 text-sm">
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="text-gray-300">{row.media_type}</span>
                          <span className="ml-auto text-xs text-gray-500">
                            {row.count} · {formatHours(row.minutes)}
                          </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${(row.count / maxBreakdown) * 100}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ── Streak (left) ───────────────────────────────────────── */}
              {(() => {
                const { current, longest, activeDays } = computeStreaks(data.activity_by_day);
                return (
                  <Card>
                    <CardLabel>Streak</CardLabel>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-5xl font-bold tabular-nums text-white">{current}</p>
                        <p className="mt-1.5 text-sm text-gray-400">day current streak</p>
                      </div>
                      <div>
                        <p className="text-5xl font-bold tabular-nums text-violet-300">{longest}</p>
                        <p className="mt-1.5 text-sm text-gray-400">day best streak</p>
                      </div>
                    </div>
                    <div className="mt-5 border-t border-white/[0.06] pt-4 text-sm text-gray-500">
                      <span className="font-semibold text-white">{activeDays}</span> active days in this period
                    </div>
                  </Card>
                );
              })()}

              {/* ── Most Time Spent (right) ───────────────────────────────── */}
              {data.top_item && (
                <Card>
                  <CardLabel>Most Time Spent</CardLabel>
                  <div className="flex h-full flex-col justify-center">
                    <p className="text-sm text-gray-400">You devoted the most hours to</p>
                    <p className="mt-3 text-2xl font-semibold leading-snug text-white">
                      {data.top_item.title}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs text-violet-300">
                        {data.top_item.media_type}
                      </span>
                      <span className="text-sm text-gray-400">{formatHours(data.top_item.minutes)}</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* ── Activity heatmap (full width) ────────────────────────── */}
              <Card className="col-span-2">
                <CardLabel>Activity Over Time</CardLabel>
                <ActivityHeatmap days={data.activity_by_day} period={period} />
              </Card>

            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
