"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (field: "email" | "password", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("Login submitted:", formData);

    // Later, connect this to your backend login route
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0f0f1a] to-[#15152a] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_40px_rgba(139,92,246,0.12)] backdrop-blur-xl md:grid-cols-2">
          <div className="hidden border-r border-white/10 bg-gradient-to-br from-violet-600/20 via-purple-500/10 to-transparent p-10 md:flex md:flex-col md:justify-between">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.25em] text-violet-300/80">
                Welcome Back
              </p>
              <h1 className="bg-gradient-to-r from-violet-300 to-purple-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
                Media Tracker
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-gray-300">
                Keep track of the games, shows, movies, manga, and books you
                spend time on — all in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-gray-300">
                A clean, modern place to log your media and build better habits.
              </p>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  Sign in
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  Enter your email and password to continue.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-sm text-violet-300 transition hover:text-violet-200"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-violet-500/30"
                >
                  Sign In
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-violet-300 transition hover:text-violet-200"
                >
                  Sign up
                </Link>
              </div>

              <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
                Built for tracking your media, one entry at a time.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}