"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      setMessage("Incorrect email or password. Please try again.");
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const user = data.user;

    const ADMIN_USER_ID = "6431960a-b0c6-4e2a-8b1a-d5017ceae103";

    if (user.id === ADMIN_USER_ID) {
      await supabase.auth.signOut();

      setMessage("This is an admin account. Please use Admin Login.");

      setLoading(false);
      return;
    }

    const {
      data: organizer,
      error: organizerError,
    } = await supabase
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (organizerError) {
      console.error("Organizer check error:", organizerError);

      await supabase.auth.signOut();

      setMessage("Unable to verify your account. Please try again.");

      setLoading(false);
      return;
    }

    if (organizer) {
      await supabase.auth.signOut();

      setMessage("This is an organizer account. Please use Organizer Login.");

      setLoading(false);
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Player profile check error:", profileError);

      await supabase.auth.signOut();

      setMessage("Unable to verify your player profile. Please try again.");

      setLoading(false);
      return;
    }

    if (!profile) {
      await supabase.auth.signOut();

      setMessage("No player profile found. Please use the correct login.");

      setLoading(false);
      return;
    }

    setMessage("Login successful! Redirecting...");

    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-black">
      <div className="mx-auto max-w-md">

        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-bold text-black no-underline">
            GAME<span className="text-green-600">ARENA</span>
          </a>

          <h1 className="mt-6 text-2xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-600">Login to continue.</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600 disabled:opacity-50"
              />
            </div>

            {message && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/register" className="font-medium text-green-600 hover:text-green-500 no-underline">
              Create one
            </a>
          </p>

        </div>

        <div className="mt-5 text-center">
          <a href="/" className="text-sm text-gray-600 hover:text-green-600 no-underline">
            ← Back to Home
          </a>
        </div>

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-center text-sm text-gray-700">
            Admin user?{" "}
            <a href="/admin" className="font-medium text-blue-600 hover:text-blue-500 no-underline">
              Login as Admin
            </a>
          </p>
        </div>

      </div>
    </main>
  );
}
