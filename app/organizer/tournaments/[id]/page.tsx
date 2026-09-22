"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  title: string;
  game: string;
  format: string;
  entry_fee: number;
  prize_pool: number;
  max_players: number;
  start_time: string;
  end_time: string | null;
  status: string;
  registration_status: string;
  is_private: boolean;
  access_number: string | null;
  room_id: string | null;
};

export default function OrganizerTournamentPage() {
  const params = useParams();
  const router = useRouter();

  const tournamentId = params.id as string;

  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadTournament();
  }, [tournamentId]);

  async function loadTournament() {
    setLoading(true);
    setError("");

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/organizer/login");
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

    if (organizerError || !organizer) {
      setError(
        "You are not authorized to view this page."
      );

      setLoading(false);
      return;
    }

    const {
      data,
      error: tournamentError,
    } = await supabase
      .from("tournaments")
      .select(
        "id, title, game, format, entry_fee, prize_pool, max_players, start_time, end_time, status, registration_status, is_private, access_number, room_id"
      )
      .eq("id", tournamentId)
      .eq("organizer_id", organizer.id)
      .maybeSingle();

    if (tournamentError) {
      console.error(
        "Organizer tournament loading error:",
        tournamentError
      );

      setError(tournamentError.message);

      setLoading(false);
      return;
    }

    if (!data) {
      setError(
        "Tournament not found or you do not have permission to view it."
      );

      setLoading(false);
      return;
    }

    setTournament(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-black">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-100 rounded"></div>
        </div>
      </main>
    );
  }

  if (error || !tournament) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-black">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => router.push("/organizer")}
            className="mb-6 text-sm font-bold text-green-600 hover:text-green-700"
          >
            ← Back to Organizer Dashboard
          </button>

          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="font-bold text-red-700">{error || "Tournament could not be loaded."}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/organizer")}
          className="mb-6 text-sm font-bold text-green-600 hover:text-green-700"
        >
          ← Back to Organizer Dashboard
        </button>

        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-600">Organizer Tournament</p>
              <h1 className="mt-2 text-4xl font-black">{tournament.title}</h1>
              <p className="mt-2 text-gray-600">{tournament.game} • {tournament.format}</p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</p>
              <p className="mt-1 font-black text-green-700">{tournament.status}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Entry Fee</p>
              <p className="mt-2 text-2xl font-black">₹{tournament.entry_fee}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Prize Pool</p>
              <p className="mt-2 text-2xl font-black">₹{tournament.prize_pool}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Max Players</p>
              <p className="mt-2 text-2xl font-black">{tournament.max_players}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Format</p>
              <p className="mt-2 text-2xl font-black capitalize">{tournament.format}</p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-black">Tournament Information</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Registration</p>
                <p className="mt-1 font-bold">{tournament.registration_status}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Private Tournament</p>
                <p className="mt-1 font-bold">{tournament.is_private ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Start Time</p>
                <p className="mt-1 font-bold">{new Date(tournament.start_time).toLocaleString()}</p>
              </div>
              {tournament.end_time && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">End Time</p>
                  <p className="mt-1 font-bold">{new Date(tournament.end_time).toLocaleString()}</p>
                </div>
              )}
              {tournament.room_id && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Room ID</p>
                  <p className="mt-1 font-bold">{tournament.room_id}</p>
                </div>
              )}
              {tournament.is_private && tournament.access_number && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Access Number</p>
                  <p className="mt-1 font-bold">{tournament.access_number}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/organizer")}
              className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-black text-black transition hover:border-green-600 hover:text-green-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
