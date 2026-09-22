"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  title: string;
  game: string;
  entry_fee: number;
  prize_pool: number;
  max_players: number;
  start_time: string;
  end_time: string;
  status: string;
  player_count: number;
  countdown: string;
};
type TournamentResult = {
  id: string;
  username: string;
  position: number;
  prize: number;
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTournaments((currentTournaments) =>
        currentTournaments.map((tournament) => {
          const now = new Date();
          const startTime = new Date(tournament.start_time);
          const endTime = new Date(tournament.end_time);

          let currentStatus = "upcoming";
          let difference = 0;

          if (now >= endTime) {
            currentStatus = "completed";
          } else if (now >= startTime) {
            currentStatus = "live";
          }

          if (now < startTime) {
            difference = startTime.getTime() - now.getTime();
          } else if (now < endTime) {
            difference = endTime.getTime() - now.getTime();
          }

          let countdown = "Tournament ended";

          if (difference > 0) {
            const days = Math.floor(
              difference / (1000 * 60 * 60 * 24)
            );

            const hours = Math.floor(
              (difference / (1000 * 60 * 60)) % 24
            );

            const minutes = Math.floor(
              (difference / (1000 * 60)) % 60
            );

            const seconds = Math.floor(
              (difference / 1000) % 60
            );

            countdown = `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`;
          }

          return {
            ...tournament,
            status: currentStatus,
            countdown,
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function loadTournaments() {
const { data: tournamentData, error: tournamentError } = await supabase
  .from("tournaments")
  .select(
    "id, title, game, entry_fee, prize_pool, max_players, start_time, end_time, status"
  )
  .eq("is_private", false)
  .order("start_time", { ascending: true });

    if (tournamentError) {
      console.error("Tournament loading error:", tournamentError);
      setLoading(false);
      return;
    }

    const { data: playerData, error: playerError } = await supabase
      .from("tournament_players")
      .select("tournament_id");

    if (playerError) {
      console.error("Player count error:", playerError);
    }

    const tournamentsWithCount = (tournamentData || []).map((tournament) => {
      const playerCount = (playerData || []).filter(
        (player) => player.tournament_id === tournament.id
      ).length;

      const now = new Date();
      const startTime = new Date(tournament.start_time);
      const endTime = new Date(tournament.end_time);

      let currentStatus = "upcoming";
      let difference = 0;

      if (now >= endTime) {
        currentStatus = "completed";
      } else if (now >= startTime) {
        currentStatus = "live";
      }

      if (now < startTime) {
        difference = startTime.getTime() - now.getTime();
      } else if (now < endTime) {
        difference = endTime.getTime() - now.getTime();
      }

      let countdown = "Tournament ended";

      if (difference > 0) {
        const days = Math.floor(
          difference / (1000 * 60 * 60 * 24)
        );

        const hours = Math.floor(
          (difference / (1000 * 60 * 60)) % 24
        );

        const minutes = Math.floor(
          (difference / (1000 * 60)) % 60
        );

        const seconds = Math.floor(
          (difference / 1000) % 60
        );

        countdown = `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`;
      }

      return {
        ...tournament,
        status: currentStatus,
        player_count: playerCount,
        countdown,
      };
    });

    setTournaments(tournamentsWithCount);
    setLoading(false);
  }

  async function handleJoin(tournament: Tournament) {
    setMessage("");
    setJoiningId(tournament.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please login before joining a tournament.");
      setJoiningId(null);
      return;
    }

    if (tournament.player_count >= tournament.max_players) {
      setMessage("This tournament is full.");
      setJoiningId(null);
      return;
    }

    if (tournament.status !== "upcoming") {
      setMessage("This tournament is not open for joining.");
      setJoiningId(null);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, game_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      setMessage("Your player profile could not be found.");
      setJoiningId(null);
      return;
    }

    const { error } = await supabase
      .from("tournament_players")
      .insert({
        tournament_id: tournament.id,
        player_id: user.id,
        username: profile.username,
        game_id: profile.game_id,
      });

    if (error) {
      if (error.code === "23505") {
        setMessage("You have already joined this tournament.");
      } else {
        console.error("Join tournament error:", error);
        setMessage("Unable to join the tournament. Please try again.");
      }

      setJoiningId(null);
      return;
    }

    setMessage(`You joined ${tournament.title} successfully!`);

    await loadTournaments();

    setJoiningId(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b12] text-white">
        <p className="text-gray-400">Loading tournaments...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-black">
      <div className="mx-auto max-w-6xl">

        <header className="flex items-center justify-between border-b border-gray-200 pb-4">
          <a href="/" className="text-xl font-bold text-black no-underline">
            GAME<span className="text-green-600">ARENA</span>
          </a>

          <a
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 no-underline transition hover:border-green-600 hover:text-green-600"
          >
            Dashboard
          </a>
        </header>

        <section className="py-8">
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <p className="mt-2 text-gray-600">Join a tournament and start competing.</p>
        </section>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-center text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {tournaments.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No tournaments available right now.</p>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-green-300"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{tournament.game}</span>
                  <span
                    className={`text-xs font-medium ${
                      tournament.status === "live"
                        ? "text-red-600"
                        : tournament.status === "completed"
                          ? "text-gray-500"
                          : "text-green-600"
                    }`}
                  >
                    {tournament.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-lg font-semibold">{tournament.title}</h3>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry Fee</span>
                    <span className="font-medium">₹{tournament.entry_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prize Pool</span>
                    <span className="font-medium text-green-600">₹{tournament.prize_pool}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Players</span>
                    <span className="font-medium">{tournament.player_count} / {tournament.max_players}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Starts</span>
                    <span className="font-medium">{new Date(tournament.start_time).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <a
                    href={`/tournaments/${tournament.id}`}
                    className="flex-1 rounded-lg border border-gray-300 py-2.5 text-center font-medium text-gray-700 no-underline transition hover:border-green-600 hover:text-green-600"
                  >
                    View Details
                  </a>

                  <button
                    onClick={() => handleJoin(tournament)}
                    disabled={
                      joiningId === tournament.id ||
                      tournament.player_count >= tournament.max_players ||
                      tournament.status !== "upcoming"
                    }
                    className="flex-1 rounded-lg bg-green-600 py-2.5 font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {joiningId === tournament.id
                      ? "Joining..."
                      : tournament.player_count >= tournament.max_players
                        ? "Full"
                        : tournament.status !== "upcoming"
                          ? "Closed"
                          : "Join"}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

      </div>
    </main>
  );
}