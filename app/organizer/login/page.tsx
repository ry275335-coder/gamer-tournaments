"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function OrganizerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError("Incorrect email or password. Please try again.");
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const ADMIN_USER_ID =
      "6431960a-b0c6-4e2a-8b1a-d5017ceae103";

    // Admin accounts cannot use Organizer Login
    if (data.user.id === ADMIN_USER_ID) {
      await supabase.auth.signOut();

      setError(
        "This is an admin account. Please use Admin Login."
      );

      setLoading(false);
      return;
    }

    // Check whether this account is an organizer
    const { data: organizer, error: organizerError } =
      await supabase
        .from("organizers")
        .select("id, status")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (organizerError) {
      console.error(
        "Organizer check error:",
        organizerError
      );

      await supabase.auth.signOut();

      setError(
        "Unable to verify organizer account. Please try again."
      );

      setLoading(false);
      return;
    }

    // Player accounts cannot use Organizer Login
    if (!organizer) {
      await supabase.auth.signOut();

      setError(
        "This is a player account. Please use Player Login."
      );

      setLoading(false);
      return;
    }

    // Valid organizer account
    setError("Login successful! Redirecting...");

    setTimeout(() => {
      router.push("/organizer");
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-3xl font-black tracking-tight"
          >
            Game<span className="text-cyan-400">Arena</span>
          </Link>

          <h1 className="mt-8 text-3xl font-bold">
            Organizer Login
          </h1>

          <p className="mt-2 text-slate-400">
            Sign in to manage your tournaments
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizer@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Organizer Login"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-6 text-center text-sm">
            <p className="text-slate-400">
              Don't have an organizer account?
            </p>

            <Link
              href="/organizer/apply"
              className="mt-2 inline-block font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Create Organizer Account
            </Link>
          </div>

          <div className="mt-4 text-center text-sm">
            <Link
              href="/login"
              className="text-slate-400 hover:text-white"
            >
              Player Login
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            ← Back to GameArena
          </Link>
        </div>
      </div>
    </main>
  );
}