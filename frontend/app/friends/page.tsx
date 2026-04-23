"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getApiBaseUrl } from "../api";
import { Nav } from "../Nav";

// ── Types ──────────────────────────────────────────────────────────────────────

type User = {
  user_id: number;
  name: string | null;
  email: string;
  friend_code: string | null;
  created_at: string | null;
  avatar_url: string | null;
  role: string | null;
};

type Friend = {
  user_id: number;
  name: string | null;
  email: string;
  avatar_url: string | null;
  friend_code: string | null;
};

type IncomingRequest = {
  request_id: number;
  sender_id: number;
  sender_name: string | null;
  sender_email: string;
  sender_avatar_url: string | null;
  created_at: string;
};

type Message = {
  message_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  sent_at: string;
};

type TypeBreakdown = { media_type: string; count: number; minutes: number };
type TopItem = { title: string; media_type: string; minutes: number };

type WrappedData = {
  total_entries: number;
  total_minutes: number;
  top_media_type: string | null;
  top_item: TopItem | null;
  longest_session_minutes: number;
  type_breakdown: TypeBreakdown[];
};

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Avatar({ url, name, size }: { url: string | null; name: string | null; size: "xs" | "sm" | "md" }) {
  const apiBase = getApiBaseUrl();
  const dim = size === "xs" ? "h-6 w-6" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSize = size === "xs" ? "text-[9px]" : size === "sm" ? "text-[11px]" : "text-sm";
  const initial = (name || "?")[0].toUpperCase();
  if (url) return <img src={`${apiBase}${url}`} alt={name || "User"} className={`${dim} rounded-full object-cover shrink-0`} />;
  return <div className={`${dim} rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0 ${textSize} font-semibold`}>{initial}</div>;
}

function displayName(f: Friend | User) { return f.name || f.email; }

function formatTime(m: number) {
  const h = Math.floor(m / 60), rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso), now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function ChartIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}

function SendIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
}

function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}

function XIcon({ size = 12 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

function ChatBubbleIcon() {
  return <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

function PersonPlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>;
}

function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
}

// ── Remove confirmation modal ──────────────────────────────────────────────────

function RemoveConfirmModal({ friend, onConfirm, onCancel }: { friend: Friend; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#0f0f1a] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
            <TrashIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Remove friend</p>
            <p className="text-xs text-gray-500">This can't be undone</p>
          </div>
        </div>
        <p className="mb-5 text-sm text-gray-400">
          Remove <span className="font-medium text-white">{displayName(friend)}</span> from your friends list?
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-sm text-gray-400 transition hover:text-gray-200">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-500/80 py-2 text-sm font-medium text-white transition hover:bg-red-500">
            Remove
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Mini Wrapped Report Modal ──────────────────────────────────────────────────

function WrappedModal({ friend, data, onClose }: { friend: Friend; data: WrappedData; onClose: () => void }) {
  const maxCount = Math.max(...data.type_breakdown.map((t) => t.count), 1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar url={friend.avatar_url} name={friend.name} size="sm" />
            <div>
              <p className="text-sm font-semibold text-white">{displayName(friend)}</p>
              <p className="text-[10px] text-gray-500">All-time stats</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-600 transition hover:bg-white/[0.06] hover:text-gray-300">
            <XIcon size={14} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {[
            { label: "Entries", value: data.total_entries.toLocaleString() },
            { label: "Watch time", value: formatTime(data.total_minutes) },
            { label: "Top category", value: data.top_media_type || "—" },
            { label: "Best session", value: formatTime(data.longest_session_minutes) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">{label}</p>
              <p className="mt-0.5 text-sm font-semibold text-white truncate">{value}</p>
            </div>
          ))}
        </div>

        {data.type_breakdown.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-gray-600">Breakdown</p>
            <div className="space-y-1.5">
              {data.type_breakdown.slice(0, 5).map((item) => (
                <div key={item.media_type} className="flex items-center gap-2">
                  <span className="w-11 shrink-0 text-[10px] text-gray-400 truncate">{item.media_type}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} />
                  </div>
                  <span className="w-5 shrink-0 text-right text-[10px] text-gray-500">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.top_item && (
          <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-violet-400/70">Most time spent</p>
            <p className="mt-0.5 text-sm font-semibold text-white truncate">{data.top_item.title}</p>
            <p className="text-[10px] text-gray-500">{data.top_item.media_type} · {formatTime(data.top_item.minutes)}</p>
          </div>
        )}

        {data.total_entries === 0 && <p className="py-4 text-center text-sm text-gray-600">No entries yet.</p>}
      </motion.div>
    </div>
  );
}

// ── Chat panel ─────────────────────────────────────────────────────────────────

function ChatPanel({ friend, currentUserId, messages, onSend, onOpenWrapped }: {
  friend: Friend; currentUserId: number; messages: Message[];
  onSend: (text: string) => void; onOpenWrapped: () => void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  }

  const grouped: { sender_id: number; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const last = grouped[grouped.length - 1];
    if (last && last.sender_id === msg.sender_id) last.msgs.push(msg);
    else grouped.push({ sender_id: msg.sender_id, msgs: [msg] });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#08080f] px-5 py-3.5 shrink-0">
        <Avatar url={friend.avatar_url} name={friend.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{displayName(friend)}</p>
          <p className="text-[10px] text-gray-500 truncate">{friend.email}</p>
        </div>
        <button
          onClick={onOpenWrapped}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-gray-400 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300"
        >
          <ChartIcon />
          Stats
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-700">No messages yet. Say hello!</p>
          </div>
        )}
        {grouped.map((group, gi) => {
          const isOwn = group.sender_id === currentUserId;
          return (
            <div key={gi} className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
              {!isOwn && <div className="mt-auto"><Avatar url={friend.avatar_url} name={friend.name} size="xs" /></div>}
              <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn && <p className="px-1 text-[10px] text-gray-600">{displayName(friend)}</p>}
                {group.msgs.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      isOwn ? "bg-violet-600 text-white" : "bg-white/[0.06] text-gray-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                <p className="px-1 text-[9px] text-gray-700">{formatTimestamp(group.msgs[group.msgs.length - 1].sent_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-white/[0.06] bg-[#08080f] px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 focus-within:border-violet-500/40 transition">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Message ${displayName(friend)}…`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
          />
          <button onClick={handleSend} disabled={!input.trim()} className="text-violet-400 transition hover:text-violet-300 disabled:text-gray-700">
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-gray-800">
      <ChatBubbleIcon />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function FriendsPage() {
  const router = useRouter();
  const apiBase = getApiBaseUrl();

  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState<Record<number, number>>({});

  const [addCode, setAddCode] = useState("");
  const [addStatus, setAddStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const [requestsPopoverOpen, setRequestsPopoverOpen] = useState(false);
  const requestsPopoverRef = useRef<HTMLDivElement>(null);

  const [removingFriend, setRemovingFriend] = useState<Friend | null>(null);

  const [wrappedFriend, setWrappedFriend] = useState<Friend | null>(null);
  const [wrappedData, setWrappedData] = useState<WrappedData | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const selectedFriendRef = useRef<Friend | null>(null);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => { selectedFriendRef.current = selectedFriend; }, [selectedFriend]);
  useEffect(() => { if (user) userIdRef.current = user.user_id; }, [user]);

  // Close requests popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (requestsPopoverRef.current && !requestsPopoverRef.current.contains(e.target as Node)) {
        setRequestsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Init ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const res = await fetch(`${apiBase}/auth/me`, { credentials: "include" });
      if (!res.ok) { router.push("/login"); return; }
      const me: User = await res.json();
      setUser(me);
      userIdRef.current = me.user_id;

      const [frRes, rqRes] = await Promise.all([
        fetch(`${apiBase}/friends`, { credentials: "include" }),
        fetch(`${apiBase}/friends/requests/incoming`, { credentials: "include" }),
      ]);
      if (frRes.ok) setFriends(await frRes.json());
      if (rqRes.ok) setRequests(await rqRes.json());
    }
    init();
  }, [apiBase, router]);

  // ── WebSocket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    let ws: WebSocket;

    fetch(`${apiBase}/auth/ws-token`, { credentials: "include" })
      .then((r) => r.json())
      .then(({ token }) => {
        const wsBase = apiBase.replace("http://", "ws://").replace("https://", "wss://");
        ws = new WebSocket(`${wsBase}/ws?token=${token}`);
        ws.onmessage = (event) => {
          const msg: Message = JSON.parse(event.data);
          const sf = selectedFriendRef.current;
          const uid = userIdRef.current;
          const isCurrentChat = sf && (
            (msg.sender_id === sf.user_id && msg.receiver_id === uid) ||
            (msg.sender_id === uid && msg.receiver_id === sf.user_id)
          );
          if (isCurrentChat) {
            setMessages((prev) => [...prev, msg]);
          } else if (msg.sender_id !== uid) {
            setUnread((prev) => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
          }
        };
        ws.onerror = () => {};
        wsRef.current = ws;
      })
      .catch(() => {});

    return () => { ws?.close(); wsRef.current = null; };
  }, [user, apiBase]);

  // ── Fetch messages when friend selected ───────────────────────────────────────

  useEffect(() => {
    if (!selectedFriend) { setMessages([]); return; }
    fetch(`${apiBase}/messages/${selectedFriend.user_id}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setMessages);
  }, [selectedFriend, apiBase]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  function handleLogout() {
    fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include" }).finally(() => router.push("/login"));
  }

  function toggleFriend(f: Friend) {
    if (selectedFriend?.user_id === f.user_id) {
      setSelectedFriend(null);
    } else {
      setSelectedFriend(f);
      setUnread((prev) => ({ ...prev, [f.user_id]: 0 }));
    }
  }

  function sendMessage(text: string) {
    if (!selectedFriend || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ to: selectedFriend.user_id, content: text }));
  }

  async function sendFriendRequest() {
    const code = addCode.trim().toUpperCase();
    if (!code) return;
    setAddLoading(true);
    setAddStatus(null);
    try {
      const res = await fetch(`${apiBase}/friends/request`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_code: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddStatus({ ok: false, text: data.detail || "Failed to send request." });
      } else {
        setAddStatus({ ok: true, text: data.status === "accepted" ? "You're now friends!" : "Friend request sent!" });
        setAddCode("");
        if (data.status === "accepted") {
          const frRes = await fetch(`${apiBase}/friends`, { credentials: "include" });
          if (frRes.ok) setFriends(await frRes.json());
        }
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function acceptRequest(req: IncomingRequest) {
    const res = await fetch(`${apiBase}/friends/requests/${req.request_id}/accept`, { method: "POST", credentials: "include" });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.request_id !== req.request_id));
      const frRes = await fetch(`${apiBase}/friends`, { credentials: "include" });
      if (frRes.ok) setFriends(await frRes.json());
    }
  }

  async function declineRequest(req: IncomingRequest) {
    await fetch(`${apiBase}/friends/requests/${req.request_id}`, { method: "DELETE", credentials: "include" });
    setRequests((prev) => prev.filter((r) => r.request_id !== req.request_id));
  }

  async function confirmRemoveFriend() {
    if (!removingFriend) return;
    const res = await fetch(`${apiBase}/friends/${removingFriend.user_id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setFriends((prev) => prev.filter((f) => f.user_id !== removingFriend.user_id));
      if (selectedFriend?.user_id === removingFriend.user_id) setSelectedFriend(null);
    }
    setRemovingFriend(null);
  }

  async function openWrapped(f: Friend) {
    setWrappedFriend(f);
    setWrappedData(null);
    const res = await fetch(`${apiBase}/friends/${f.user_id}/wrapped`, { credentials: "include" });
    if (res.ok) setWrappedData(await res.json());
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080f] text-white">
      <Nav user={user} onLogout={handleLogout} onUserUpdate={setUser} />

      <div className="ml-56 flex flex-1 overflow-hidden">
        {/* ── Left panel ───────────────────────────────────────────────────────── */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-white/[0.06] bg-[#08080f]">

          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-5">
            <div>
              <h1 className="text-base font-semibold text-white">Friends</h1>
              <p className="text-xs text-gray-600">{friends.length} {friends.length === 1 ? "friend" : "friends"}</p>
            </div>

            {/* Requests icon with popover */}
            <div className="relative" ref={requestsPopoverRef}>
              <button
                onClick={() => setRequestsPopoverOpen((o) => !o)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  requestsPopoverOpen ? "bg-violet-500/20 text-violet-300" : "text-gray-600 hover:bg-white/[0.06] hover:text-gray-300"
                }`}
                title="Friend requests"
              >
                <PersonPlusIcon />
                {requests.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white">
                    {requests.length > 9 ? "9+" : requests.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {requestsPopoverOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-10 z-30 w-64 rounded-xl border border-white/[0.08] bg-[#0f0f1a] shadow-2xl"
                  >
                    <p className="border-b border-white/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                      Incoming requests
                    </p>
                    {requests.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-gray-700">No pending requests.</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
                        {requests.map((req) => (
                          <div key={req.request_id} className="flex items-center gap-2 px-3 py-2.5">
                            <Avatar url={req.sender_avatar_url} name={req.sender_name} size="xs" />
                            <p className="flex-1 min-w-0 truncate text-xs text-gray-300">{req.sender_name || req.sender_email}</p>
                            <button onClick={() => acceptRequest(req)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400 transition hover:bg-green-500/30">
                              <CheckIcon />
                            </button>
                            <button onClick={() => declineRequest(req)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-gray-500 transition hover:bg-white/[0.1] hover:text-gray-300">
                              <XIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Add friend */}
          <div className="px-3 pb-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Add Friend</p>
              <div className="flex gap-1.5">
                <input
                  value={addCode}
                  onChange={(e) => { setAddCode(e.target.value.toUpperCase()); setAddStatus(null); }}
                  onKeyDown={(e) => e.key === "Enter" && sendFriendRequest()}
                  placeholder="XXXXX-XXXXX"
                  maxLength={11}
                  className="flex-1 min-w-0 rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-mono text-xs text-white placeholder:text-gray-700 outline-none focus:border-violet-500/50 transition"
                />
                <button
                  onClick={sendFriendRequest}
                  disabled={addLoading || !addCode.trim()}
                  className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500 disabled:opacity-40"
                >
                  {addLoading ? "…" : "Add"}
                </button>
              </div>
              {addStatus && (
                <p className={`mt-1.5 text-[10px] ${addStatus.ok ? "text-green-400" : "text-red-400"}`}>
                  {addStatus.text}
                </p>
              )}
            </div>
          </div>

          {/* Divider + label */}
          <div className="mx-3 mb-2 h-px bg-white/[0.06]" />
          <p className="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-widest text-gray-700">Your friends</p>

          {/* Friends list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {friends.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-gray-700">No friends yet.</p>
            ) : (
              <div className="space-y-0.5">
                {friends.map((f) => {
                  const isSelected = selectedFriend?.user_id === f.user_id;
                  const unreadCount = unread[f.user_id] || 0;
                  return (
                    <div
                      key={f.user_id}
                      className={`group flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 transition ${
                        isSelected ? "bg-violet-500/15 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]" : "hover:bg-white/[0.04]"
                      }`}
                      onClick={() => toggleFriend(f)}
                    >
                      <div className="relative">
                        <Avatar url={f.avatar_url} name={f.name} size="sm" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`truncate text-xs font-medium ${isSelected ? "text-violet-200" : "text-gray-300"}`}>
                          {displayName(f)}
                        </p>
                      </div>

                      {/* Stats button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); openWrapped(f); }}
                        className={`rounded-md p-1 transition ${
                          isSelected ? "text-violet-400 hover:bg-violet-500/20" : "text-gray-700 opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] hover:text-gray-400"
                        }`}
                        title="View stats"
                      >
                        <ChartIcon />
                      </button>

                      {/* Remove button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setRemovingFriend(f); }}
                        className="rounded-md p-1 text-gray-700 opacity-0 transition hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
                        title="Remove friend"
                      >
                        <XIcon size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── Right panel ──────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedFriend ? (
              <motion.div
                key={selectedFriend.user_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <ChatPanel
                  friend={selectedFriend}
                  currentUserId={user?.user_id ?? 0}
                  messages={messages}
                  onSend={sendMessage}
                  onOpenWrapped={() => openWrapped(selectedFriend)}
                />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="flex flex-1 flex-col">
                <EmptyChat />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {removingFriend && (
          <RemoveConfirmModal
            friend={removingFriend}
            onConfirm={confirmRemoveFriend}
            onCancel={() => setRemovingFriend(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {wrappedFriend && wrappedData && (
          <WrappedModal
            friend={wrappedFriend}
            data={wrappedData}
            onClose={() => { setWrappedFriend(null); setWrappedData(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
