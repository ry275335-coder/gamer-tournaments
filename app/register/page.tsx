"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

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

    setMessage("Account created successfully! Redirecting to login...");

    setUsername("");
    setEmail("");
    setGame("");
    setGameId("");
    setPassword("");
    setConfirmPassword("");

    setLoading(false);

    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-black">
      <div className="mx-auto max-w-md">

        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-bold text-black no-underline">
            GAME<span className="text-green-600">ARENA</span>
          </a>

          <h1 className="mt-6 text-2xl font-bold">Create Your Profile</h1>
          <p className="mt-2 text-sm text-gray-600">Join the competition and start gaming.</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">

          <form onSubmit={handleRegister} className="space-y-4">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Select Game
              </label>

              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
              >
                <option value="">Choose your game</option>
                <option value="bgmi">BGMI</option>
                <option value="free-fire">Free Fire</option>
                <option value="cod-mobile">Call of Duty Mobile</option>
                <option value="valorant">Valorant</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Game ID
              </label>

              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter your in-game ID"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
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
                placeholder="Create a password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
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
              {loading ? "Creating Account..." : "Create Profile"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-green-600 hover:text-green-500 no-underline">
              Login
            </a>
          </p>
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
