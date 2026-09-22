"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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

    const ADMIN_USER_ID = "6431960a-b0c6-4e2a-8b1a-d5017ceae103";

    if (data.user.id === ADMIN_USER_ID) {
      await supabase.auth.signOut();
      setError("This is an admin account. Please use Admin Login.");
      setLoading(false);
      return;
    }

    const { data: organizer, error: organizerError } =
      await supabase
        .from("organizers")
        .select("id, status")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (organizerError) {
      console.error("Organizer check error:", organizerError);
      await supabase.auth.signOut();
      setError("Unable to verify organizer account. Please try again.");
      setLoading(false);
      return;
    }

    if (!organizer) {
      await supabase.auth.signOut();
      setError("This is a player account. Please use Player Login.");
      setLoading(false);
      return;
    }

    setError("Login successful! Redirecting...");

    setTimeout(() => {
      router.push("/organizer");
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-black">
      <div className="mx-auto max-w-md">

        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-bold text-black no-underline">
            GAME<span className="text-green-600">ARENA</span>
          </a>

          <h1 className="mt-6 text-2xl font-bold">Organizer Login</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to manage your tournaments.</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizer@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Organizer Login"}
            </button>
          </form>

          <div className="mt-5 border-t border-gray-200 pt-5 text-center text-sm">
            <p className="text-gray-600">Don't have an organizer account?</p>
            <a href="/organizer/apply" className="mt-1 inline-block font-medium text-green-600 hover:text-green-500 no-underline">
              Create Organizer Account
            </a>
          </div>

          <div className="mt-3 text-center text-sm">
            <a href="/login" className="text-gray-600 hover:text-green-600 no-underline">
              Player Login
            </a>
          </div>
        </div>

        <div className="mt-5 text-center">
          <a href="/" className="text-sm text-gray-600 hover:text-green-600 no-underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
