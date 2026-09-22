"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PrivateTournamentPage() {
  const router = useRouter();

  const [accessNumber, setAccessNumber] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError("");

    const cleanNumber = accessNumber.trim();
    const cleanPassword = accessPassword.trim();

    if (!cleanNumber || !cleanPassword) {
      setError("Please enter both tournament number and password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc("get_private_tournament", {
      p_access_number: cleanNumber,
      p_access_password: cleanPassword,
    });

    if (error) {
      console.error("Private tournament access error:", error);
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const tournament = Array.isArray(data) ? data[0] : data;

    if (!tournament) {
      setError("Invalid tournament number or password.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem(
      `private-tournament-access-${tournament.id}`,
      JSON.stringify({
        granted: true,
        tournamentId: tournament.id,
        expiresAt: Date.now() + 30 * 60 * 1000,
      })
    );

    router.push(`/tournaments/${tournament.id}`);
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-black">
      <div className="mx-auto max-w-md">

        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-bold text-black no-underline">
            GAME<span className="text-green-600">ARENA</span>
          </a>

          <h1 className="mt-6 text-2xl font-bold">Join Private Tournament</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter the tournament number and password provided by the organizer.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tournament Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={accessNumber}
                onChange={(e) => setAccessNumber(e.target.value)}
                placeholder="Enter tournament number"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tournament Password
              </label>

              <input
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Enter tournament password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Checking..." : "Access Tournament"}
            </button>

          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Don't have the access credentials?{" "}
            <a href="/tournaments" className="font-medium text-green-600 hover:text-green-500 no-underline">
              Browse public tournaments
            </a>
          </p>

        </div>

        <div className="mt-5 text-center">
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-green-600 no-underline">
            ← Back to Dashboard
          </a>
        </div>

      </div>
    </main>
  );
}
