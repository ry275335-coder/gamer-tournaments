"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
function getTournamentStatus(
  startTime: string,
  endTime?: string | null
) {
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();

  if (endTime) {
    const end = new Date(endTime).getTime();

    if (now >= start && now <= end) {
      return "LIVE";
    }

    if (now > end) {
      return "ENDED";
    }
  }

  if (now >= start) {
    return "LIVE";
  }

  return "UPCOMING";
}

export default function Home() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tournamentPlayerCounts, setTournamentPlayerCounts] =
    useState<Record<string, number>>({});
  const [winners, setWinners] = useState<any[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadTournaments() {
const { data, error } = await supabase
  .from("tournaments")
  .select("*")
  .eq("is_private", false)
  .order("start_time", { ascending: true })
  .limit(3);

     if (!error && data) {
  const sortedTournaments = [...data]
    .sort((a, b) => {
      const aStatus = getTournamentStatus(
        a.start_time,
        a.end_time
      );

      const bStatus = getTournamentStatus(
        b.start_time,
        b.end_time
      );

      // LIVE tournaments come first
      if (aStatus === "LIVE" && bStatus !== "LIVE") {
        return -1;
      }

      if (aStatus !== "LIVE" && bStatus === "LIVE") {
        return 1;
      }

      // Otherwise sort by start time
      return (
        new Date(a.start_time).getTime() -
        new Date(b.start_time).getTime()
      );
    })
    .slice(0, 3);

  setTournaments(sortedTournaments);

  const counts: Record<string, number> = {};

  for (const tournament of sortedTournaments) {
    const { count } = await supabase
      .from("tournament_players")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournament.id);

    counts[tournament.id] = count || 0;
  }

  setTournamentPlayerCounts(counts);
}
const { data: winnerData, error: winnerError } = await supabase
  .from("tournament_results")
  .select("id, username, position, prize, tournament_id")
  .eq("position", 1)
  .order("created_at", { ascending: false })
  .limit(3);
  if (!winnerError && winnerData) {
  setWinners(winnerData);
}

if (!winnerError && winnerData) {
  setWinners(winnerData);
}

      const { count: playersCount, error: playersError } = await supabase
        .from("tournament_players")
        .select("*", { count: "exact", head: true });

      if (!playersError) {
        setPlayerCount(playersCount || 0);
      }

      const { count: tournamentsCount, error: tournamentsError } =
        await supabase
          .from("tournaments")
          .select("*", { count: "exact", head: true });

      if (!tournamentsError) {
        setTournamentCount(tournamentsCount || 0);
      }

      const { count: matchesCount, error: matchesError } = await supabase
        .from("tournament_results")
        .select("*", { count: "exact", head: true });

      if (!matchesError) {
        setMatchCount(matchesCount || 0);
      }
    }

    loadTournaments();
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Navbar */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-xl font-bold no-underline">
              GAME<span className="text-green-600">ARENA</span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden gap-6 md:flex">
              <a href="/" className="text-sm font-medium text-green-600 no-underline">
                Home
              </a>
              <a href="/tournaments" className="text-sm font-medium text-gray-600 no-underline hover:text-green-600">
                Tournaments
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 no-underline hover:text-green-600">
                How It Works
              </a>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-600 md:hidden"
                aria-label="Toggle menu"
              >
                ☰
              </button>

              {/* Desktop Buttons */}
              <a
                href="/login"
                className="hidden rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 no-underline transition hover:border-green-600 hover:text-green-600 md:block"
              >
                Login
              </a>

              <a
                href="/register"
                className="hidden rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-green-500 md:block"
              >
                Get Started
              </a>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 md:hidden">
              <a href="/" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-4 py-2.5 text-green-600 no-underline">
                Home
              </a>
              <a href="/tournaments" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-4 py-2.5 text-gray-600 no-underline hover:bg-gray-50">
                Tournaments
              </a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-4 py-2.5 text-gray-600 no-underline hover:bg-gray-50">
                How It Works
              </a>

              <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                <a
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg border border-gray-300 px-4 py-2.5 text-center font-medium text-gray-700 no-underline"
                >
                  Login
                </a>
                <a
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg bg-green-600 px-4 py-2.5 text-center font-medium text-white no-underline"
                >
                  Get Started
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                Play. Compete.<br />
                <span className="text-green-600">Win Rewards.</span>
              </h1>

              <p className="mt-4 text-lg text-gray-600">
                Join gaming tournaments, compete with other players, and win exciting prizes.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/register"
                  className="rounded-lg bg-green-600 px-6 py-3 text-center font-medium text-white no-underline transition hover:bg-green-500"
                >
                  Get Started Free
                </a>

                <a
                  href="/tournaments"
                  className="rounded-lg border border-gray-300 px-6 py-3 text-center font-medium text-gray-700 no-underline transition hover:border-green-600 hover:text-green-600"
                >
                  Browse Tournaments
                </a>
              </div>
            </div>

            {/* Stats Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Stats</h3>
                <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600"></span>
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Players</p>
                  <p className="mt-1 text-2xl font-bold">{playerCount}+</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Tournaments</p>
                  <p className="mt-1 text-2xl font-bold">{tournamentCount}+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Tournaments */}
      <section className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Featured Tournaments</h2>
            <a href="/tournaments" className="text-sm font-medium text-green-600 no-underline hover:underline">
              View all →
            </a>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {tournaments.map((tournament) => {
              const now = new Date();
              const startTime = new Date(tournament.start_time);
              const endTime = tournament.end_time
                ? new Date(tournament.end_time)
                : null;

              let status = "UPCOMING";
              if (endTime && now >= endTime) {
                status = "COMPLETED";
              } else if (now >= startTime) {
                status = "LIVE";
              }

              return (
                <div
                  key={tournament.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-green-300"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">{tournament.game}</span>
                    <span
                      className={`text-xs font-medium ${
                        status === "LIVE"
                          ? "text-red-600"
                          : status === "COMPLETED"
                            ? "text-gray-500"
                            : "text-green-600"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold">{tournament.title}</h3>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry</span>
                      <span className="font-medium">₹{tournament.entry_fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prize</span>
                      <span className="font-medium text-green-600">₹{tournament.prize_pool}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Players</span>
                      <span className="font-medium">{tournamentPlayerCounts[tournament.id] || 0}/{tournament.max_players}</span>
                    </div>
                  </div>

                  <a
                    href={`/tournaments/${tournament.id}`}
                    className="mt-4 block w-full rounded-lg bg-green-600 py-2.5 text-center font-medium text-white no-underline transition hover:bg-green-500"
                  >
                    View Details
                  </a>
                </div>
              );
            })}

            {tournaments.length === 0 && (
              <div className="col-span-full rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-gray-600">No tournaments available right now.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent Winners */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-bold">Recent Winners</h2>

          <div className="grid gap-4 md:grid-cols-3">
            {winners.map((winner, index) => (
              <div
                key={winner.id}
                className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-yellow-300"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-xl">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </div>
                  <div>
                    <p className="font-semibold">{winner.username}</p>
                    <p className="text-sm text-gray-600">Won ₹{winner.prize}</p>
                  </div>
                </div>
              </div>
            ))}

            {winners.length === 0 && (
              <div className="col-span-full rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-600">No winners yet. Be the first one!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-2xl font-bold">How It Works</h2>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: "👤", title: "Create Account", description: "Sign up as a player or organizer" },
              { icon: "🎮", title: "Join Tournament", description: "Browse and join competitions" },
              { icon: "⚔️", title: "Play & Compete", description: "Enter matches and compete" },
              { icon: "🏆", title: "Win Rewards", description: "Check results and prizes" },
            ].map((step, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
                <span className="text-2xl">{step.icon}</span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-bold">
                GAME<span className="text-green-600">ARENA</span>
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Join tournaments, compete with players, and win rewards.
              </p>
            </div>

            <div>
              <h4 className="font-semibold">Quick Links</h4>
              <div className="mt-3 space-y-2">
                <a href="/" className="block text-sm text-gray-600 no-underline hover:text-green-600">Home</a>
                <a href="/tournaments" className="block text-sm text-gray-600 no-underline hover:text-green-600">Tournaments</a>
                <a href="#how-it-works" className="block text-sm text-gray-600 no-underline hover:text-green-600">How It Works</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Account</h4>
              <div className="mt-3 space-y-2">
                <a href="/login" className="block text-sm text-gray-600 no-underline hover:text-green-600">Player Login</a>
                <a href="/register" className="block text-sm text-gray-600 no-underline hover:text-green-600">Create Account</a>
                <a href="/organizer/login" className="block text-sm text-gray-600 no-underline hover:text-yellow-600">Organizer Login</a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-600">
            © 2026 GameArena. Created by <span className="font-medium text-green-600">Ritesh</span>
          </div>
        </div>
      </footer>
    </main>
  );
}