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

    const { data, error } = await supabase.rpc(
      "get_private_tournament",
      {
        p_access_number: cleanNumber,
        p_access_password: cleanPassword,
      }
    );

    if (error) {
      console.error("Private tournament access error:", error);
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const tournament = Array.isArray(data)
      ? data[0]
      : data;

    if (!tournament) {
      setError("Invalid tournament number or password.");
      setLoading(false);
      return;
    }

    /*
      Store temporary access information so the private
      tournament details page knows the player passed
      the number + password check.
    */
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
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-md">

        <button
          onClick={() => router.push("/dashboard")}
          className="mb-8 text-sm text-slate-400 transition hover:text-white"
        >
          ← Back to Dashboard
        </button>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">

          <h1 className="text-2xl font-bold">
            Join Private Tournament
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Enter the tournament number and password provided by the organizer.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium">
                Tournament Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={accessNumber}
                onChange={(e) => setAccessNumber(e.target.value)}
                placeholder="Enter tournament number"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Tournament Password
              </label>

              <input
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Enter tournament password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Checking..." : "Access Tournament"}
            </button>

          </form>

        </div>
      </div>
    </main>
  );
}