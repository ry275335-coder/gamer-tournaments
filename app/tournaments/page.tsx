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
      .select("*")
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
    <main className="min-h-screen bg-[#080b12] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">

        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <a
            href="/"
            className="text-2xl font-black no-underline"
          >
            GAME<span className="text-green-400">ARENA</span>
          </a>

          <a
            href="/dashboard"
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold no-underline transition hover:border-green-400 hover:text-green-400"
          >
            Dashboard
          </a>
        </header>

        <section className="py-12">
          <p className="text-sm font-bold uppercase tracking-widest text-green-400">
            GameArena
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Upcoming Tournaments 🏆
          </h1>

          <p className="mt-3 text-gray-400">
            Choose a tournament and compete for the prize pool.
          </p>
        </section>

        {message && (
          <div className="mb-6 rounded-xl border border-green-400/20 bg-green-400/10 p-4 text-center text-sm font-bold text-green-400">
            {message}
          </div>
        )}

        {tournaments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-gray-400">
              No tournaments available right now.
            </p>
          </div>
        ) : (
          <section className="grid gap-6 md:grid-cols-2">

            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-green-400/40"
              >

                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-400">
                      {tournament.game}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {tournament.title}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      tournament.status === "live"
                        ? "bg-red-400/10 text-red-400"
                        : tournament.status === "completed"
                        ? "bg-gray-400/10 text-gray-400"
                        : "bg-green-400/10 text-green-400"
                    }`}
                  >
                    {tournament.status.toUpperCase()}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">

                  <div className="rounded-xl bg-black/20 p-4">
                    <p className="text-xs text-gray-500">
                      Entry Fee
                    </p>

                    <p className="mt-1 text-lg font-black">
                      ₹{tournament.entry_fee}
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/20 p-4">
                    <p className="text-xs text-gray-500">
                      Prize Pool
                    </p>

                    <p className="mt-1 text-lg font-black text-green-400">
                      ₹{tournament.prize_pool}
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/20 p-4">
                    <p className="text-xs text-gray-500">
                      Players
                    </p>

                    <p className="mt-1 text-lg font-black">
                      {tournament.player_count} / {tournament.max_players}
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/20 p-4">
                    <p className="text-xs text-gray-500">
                      Starts
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {new Date(
                        tournament.start_time
                      ).toLocaleString()}
                    </p>
                  </div>

                </div>

                <div className="mt-5 rounded-xl border border-green-400/20 bg-green-400/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-green-400">
                    {tournament.status === "upcoming"
                      ? "Starts In"
                      : tournament.status === "live"
                      ? "Ends In"
                      : "Tournament Status"}
                  </p>

                  <p className="mt-2 text-2xl font-black text-green-400">
                    {tournament.countdown}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">

                  <a
                    href={`/tournaments/${tournament.id}`}
                    className="rounded-xl border border-white/10 py-3.5 text-center font-black no-underline transition hover:border-green-400 hover:text-green-400"
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
                    className="rounded-xl bg-green-400 py-3.5 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {joiningId === tournament.id
                      ? "Joining..."
                      : tournament.player_count >= tournament.max_players
                      ? "Tournament Full"
                      : tournament.status === "live"
                      ? "Tournament Live"
                      : tournament.status === "completed"
                      ? "Completed"
                      : "Join Tournament"}
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