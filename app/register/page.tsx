"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [game, setGame] = useState("");
  const [gameId, setGameId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!username || !email || !game || !gameId || !password) {
      setMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          username,
          game,
          game_id: gameId,
        });

      if (profileError) {
        setMessage(profileError.message);
        setLoading(false);
        return;
      }
    }

    setMessage(
      "Account created successfully! Redirecting to login..."
    );

    setUsername("");
    setEmail("");
    setGame("");
    setGameId("");
    setPassword("");
    setConfirmPassword("");

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#080b12] px-6 py-12 text-white">
      <div className="mx-auto max-w-md">

        {/* Logo */}
        <div className="mb-10 text-center">
          <a href="/" className="text-3xl font-black">
            GAME<span className="text-green-400">ARENA</span>
          </a>

          <h1 className="mt-8 text-3xl font-black">
            Create Your Profile
          </h1>

          <p className="mt-3 text-gray-400">
            Join the competition and start your gaming journey.
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">

          <form onSubmit={handleRegister} className="space-y-5">

            {/* Username */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-green-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-green-400"
              />
            </div>

            {/* Game */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Select Game
              </label>

              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#11151f] px-4 py-3 outline-none focus:border-green-400"
              >
                <option value="">Choose your game</option>
                <option value="bgmi">BGMI</option>
                <option value="free-fire">Free Fire</option>
                <option value="cod-mobile">
                  Call of Duty Mobile
                </option>
                <option value="valorant">Valorant</option>
              </select>
            </div>

            {/* Game ID */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Game ID
              </label>

              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter your in-game ID"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-green-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-green-400"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-sm font-bold">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Confirm your password"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-green-400"
              />
            </div>

            {/* Message */}
            {message && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-green-400">
                {message}
              </div>
            )}

            {/* Register */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-400 py-3.5 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Profile"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <a
              href="#"
              className="font-bold text-green-400"
            >
              Login
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