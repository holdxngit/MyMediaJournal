"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type User = {
  user_id: number;
  name: string | null;
  email: string;
};

type Props = {
  user: User | null;
  onLogout: () => void;
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

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function Nav({ user, onLogout }: Props) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Journal", icon: <BookIcon />, active: pathname === "/" },
    { href: "/reports", label: "Reports", icon: <BarChartIcon />, active: pathname === "/reports", soon: true },
  ];

  return (
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
              className="group flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 select-none"
            >
              <span className="opacity-50">{item.icon}</span>
              <span>{item.label}</span>
              <span className="ml-auto rounded-full border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-500/60">
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
            <div className="mb-2 flex items-center gap-2.5 px-1 pt-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                <UserIcon />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-200">
                  {user.name || user.email}
                </p>
                {user.name && (
                  <p className="truncate text-[10px] text-gray-500">{user.email}</p>
                )}
              </div>
            </div>
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
  );
}
