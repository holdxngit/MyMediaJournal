"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { getApiBaseUrl } from "./api";

type User = {
  user_id: number;
  name: string | null;
  email: string;
  friend_code: string | null;
  created_at: string | null;
  avatar_url: string | null;
  role: string | null;
};

type Props = {
  user: User | null;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
};

function BookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function DefaultAvatarIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Avatar({ url, size }: { url: string | null; size: "sm" | "lg" }) {
  const apiBase = getApiBaseUrl();
  const dim = size === "sm" ? "h-7 w-7" : "h-16 w-16";
  const iconSize = size === "sm" ? 15 : 28;

  if (url) {
    return (
      <img
        src={`${apiBase}${url}`}
        alt="Profile"
        className={`${dim} rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300`}>
      <DefaultAvatarIcon size={iconSize} />
    </div>
  );
}

function SettingsModal({
  user,
  onClose,
  onUserUpdate,
}: {
  user: User;
  onClose: () => void;
  onUserUpdate: (user: User) => void;
}) {
  const apiBase = getApiBaseUrl();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCopy() {
    if (!user.friend_code) return;
    navigator.clipboard.writeText(user.friend_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${apiBase}/auth/avatar`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Upload failed.");
        return;
      }
      const updated: User = await res.json();
      onUserUpdate(updated);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Account Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition hover:bg-white/[0.06] hover:text-gray-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Avatar upload */}
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="relative">
            {user.avatar_url ? (
              <img
                src={`${apiBase}${user.avatar_url}`}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 ring-2 ring-white/10">
                <DefaultAvatarIcon size={28} />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow-md transition hover:bg-violet-500 disabled:opacity-50"
            >
              <CameraIcon />
            </button>
          </div>
          <p className="text-[10px] text-gray-600">
            {uploading ? "Uploading…" : "Click to change photo"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div className="rounded-xl bg-white/[0.04] px-4 py-3">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Name</p>
            <p className="text-sm text-gray-200">{user.name || "—"}</p>
          </div>

          <div className="rounded-xl bg-white/[0.04] px-4 py-3">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Email</p>
            <p className="text-sm text-gray-200">{user.email}</p>
          </div>

          <div className="rounded-xl bg-white/[0.04] px-4 py-3">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Member since</p>
            <p className="text-sm text-gray-200">{formatDate(user.created_at)}</p>
          </div>

          <div className="rounded-xl bg-white/[0.04] px-4 py-3">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Role</p>
            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
              user.role === "admin"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-violet-500/15 text-violet-300"
            }`}>
              {user.role || "user"}
            </span>
          </div>

          <div className="rounded-xl bg-white/[0.04] px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Friend Code</p>
                <p className="font-mono text-sm tracking-wider text-violet-300">
                  {user.friend_code || "—"}
                </p>
              </div>
              {user.friend_code && (
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                    copied
                      ? "bg-green-500/15 text-green-400"
                      : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-gray-200"
                  }`}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Nav({ user, onLogout, onUserUpdate }: Props) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Journal", icon: <BookIcon />, active: pathname === "/", soon: false },
    { href: "/reports", label: "Reports", icon: <BarChartIcon />, active: pathname === "/reports", soon: false },
    { href: "/friends", label: "Friends", icon: <FriendsIcon />, active: pathname === "/friends", soon: false },
  ];

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-white/[0.06] bg-[#08080f]">
        {/* Brand */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">MediaJournal</p>
              <p className="text-[10px] text-gray-500">Personal tracker</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-4 h-px bg-white/[0.06]" />

        {/* Nav label */}
        <p className="mb-2 px-5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          Navigation
        </p>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map((item) =>
            item.soon ? (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 cursor-default"
              >
                <span className="text-gray-700">{item.icon}</span>
                {item.label}
                <span className="ml-auto rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-600">
                  Soon
                </span>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  item.active
                    ? "bg-violet-500/15 text-violet-300 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]"
                    : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                }`}
              >
                <span className={item.active ? "text-violet-400" : "text-gray-500 group-hover:text-gray-300"}>
                  {item.icon}
                </span>
                {item.label}
                {item.active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                )}
              </Link>
            )
          )}
        </nav>

        {/* Bottom — user + logout */}
        <div className="mt-auto px-3 pb-5">
          <div className="mx-px mb-1 h-px bg-white/[0.06]" />
          <div className="rounded-xl p-2">
            {user && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="mb-2 flex w-full items-center gap-2.5 rounded-lg px-1 pt-1 pb-1 text-left transition hover:bg-white/[0.04]"
              >
                <Avatar url={user.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-200">
                    {user.name || user.email}
                  </p>
                  {user.name && (
                    <p className="truncate text-[10px] text-gray-500">{user.email}</p>
                  )}
                </div>
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-gray-500 transition hover:bg-white/[0.04] hover:text-gray-300"
            >
              <LogoutIcon />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {settingsOpen && user && (
        <SettingsModal
          user={user}
          onClose={() => setSettingsOpen(false)}
          onUserUpdate={(updated) => {
            onUserUpdate(updated);
          }}
        />
      )}
    </>
  );
}
