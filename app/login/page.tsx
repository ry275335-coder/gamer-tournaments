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

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("Incorrect email or password. Please try again.");
      setLoading(false);
      return;
    }

setMessage("Login successful! Redirecting...");

setTimeout(async () => {
  const { data } = await supabase.auth.getUser();

  const ADMIN_USER_ID = "6431960a-b0c6-4e2a-8b1a-d5017ceae103";

  if (data.user?.id === ADMIN_USER_ID) {
    router.push("/admin");
  } else {
    router.push("/dashboard");
  }
}, 1000);
  }

  return (
    <main className="min-h-screen bg-[#080b12] px-6 py-12 text-white">
      <div className="mx-auto max-w-md">

        <div className="mb-10 text-center">
          <a href="/" className="text-3xl font-black">
            GAME<span className="text-green-400">ARENA</span>
          </a>

          <h1 className="mt-8 text-3xl font-black">
            Welcome Back
          </h1>

          <p className="mt-3 text-gray-400">
            Login to continue your gaming journey.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">

          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-bold">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-green-400 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-green-400 disabled:opacity-50"
              />
            </div>

            {message && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-green-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-400 py-3.5 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging In..." : "Login"}
            </button>

          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <a
              href="/register"
              className="font-bold text-green-400 hover:text-green-300"
            >
              Create Profile
            </a>
          </p>

        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-white"
          >
            ← Back to Home
          </a>
        </div>

      </div>
    </main>
  );
}