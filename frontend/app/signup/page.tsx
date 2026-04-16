"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { getApiBaseUrl } from "../api";

type ApiValidationError = {
  loc?: Array<string | number>;
  msg?: string;
};

function formatApiError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;

  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item: ApiValidationError) => {
        const field = item.loc?.filter((part) => part !== "body").join(".");
        return field && item.msg ? `${field}: ${item.msg}` : item.msg;
      })
      .filter(Boolean)
      .join(" ");
  }

  return fallback;
}

export default function SignupPage() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${apiBaseUrl}/auth/me`, { credentials: "include" }).then((res) => {
      if (res.ok) router.replace("/");
    });
  }, [apiBaseUrl, router]);

  const handleChange = (
    field: "name" | "email" | "password" | "confirmPassword",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(formatApiError(data, "Could not create account."));
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0f0f1a] to-[#15152a] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_40px_rgba(139,92,246,0.12)] backdrop-blur-xl sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="bg-gradient-to-r from-violet-300 to-purple-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
              Create Account
            </h1>
            <p className="mt-3 text-sm text-gray-400">
              Start tracking the media you enjoy.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Name
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 font-medium text-white transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-violet-500/30"
            >
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-violet-300 transition hover:text-violet-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
