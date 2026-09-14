"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
      .order("start_time", { ascending: true })
      .limit(3);

    if (!error && data) {
      setTournaments(data);

      const counts: Record<string, number> = {};

      for (const tournament of data) {
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
    <main className="min-h-screen bg-[#080b12] text-white">
     {/* Navbar */}
<header className="border-b border-white/10">
  <div className="mx-auto max-w-7xl px-6 py-5">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-black">
        GAME<span className="text-green-400">ARENA</span>
      </h1>

      {/* Desktop Navigation */}
      <nav className="hidden gap-8 md:flex">
        <a href="/" className="text-green-400">
          Home
        </a>

        <a
          href="/tournaments"
          className="text-gray-400 hover:text-white"
        >
          Tournaments
        </a>

        <a
          href="/tournaments"
          className="text-gray-400 hover:text-white"
        >
          Leaderboard
        </a>

        <a
          href="#how-it-works"
          className="text-gray-400 hover:text-white"
        >
          How It Works
        </a>
      </nav>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg border border-white/10 px-3 py-2 text-xl md:hidden"
          aria-label="Toggle menu"
        >
          ☰
        </button>

       {/* Login / Register */}
<div className="hidden gap-3 md:flex">
  <a
    href="/login"
    className="rounded-lg border border-white/10 px-4 py-2"
  >
    Login
  </a>

  <a
    href="/register"
    className="rounded-lg bg-green-400 px-4 py-2 font-bold text-black"
  >
    Register
  </a>
</div>
      </div>
    </div>

    {/* Mobile Menu */}
    {mobileMenuOpen && (
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4 md:hidden">
        <a
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-green-400 hover:bg-white/5"
        >
          Home
        </a>

        <a
          href="/tournaments"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-gray-300 hover:bg-white/5"
        >
          Tournaments
        </a>

        <a
          href="/tournaments"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-gray-300 hover:bg-white/5"
        >
          Leaderboard
        </a>

        <a
          href="#how-it-works"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-gray-300 hover:bg-white/5"
        >
          How It Works
        </a>
        <div className="mt-3 flex gap-3 border-t border-white/10 pt-4">
  <a
    href="/login"
    onClick={() => setMobileMenuOpen(false)}
    className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-center font-bold text-white"
  >
    Login
  </a>

  <a
    href="/register"
    onClick={() => setMobileMenuOpen(false)}
    className="flex-1 rounded-xl bg-green-400 px-4 py-3 text-center font-bold text-black"
  >
    Register
  </a>
</div>
      </div>
    )}
  </div>
</header>

{/* Hero */}
<section className="relative overflow-hidden">
  <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
    <div className="grid items-center gap-14 lg:grid-cols-2">
      
      {/* Hero Content */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-400">
          <span className="h-2 w-2 rounded-full bg-green-400"></span>
          Competitive Gaming Platform
        </div>

        <h2 className="mt-7 text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
          PLAY.
          <br />
          COMPETE.
          <br />
          <span className="text-green-400">CONQUER.</span>
        </h2>

        <p className="mt-7 max-w-xl text-lg leading-8 text-gray-400 md:text-xl">
          Join gaming tournaments, compete against players,
          climb the leaderboard and win exciting rewards.
        </p>

        <div className="mt-9 flex flex-col gap-4 sm:flex-row">
          <a
            href="/register"
            className="rounded-xl bg-green-400 px-7 py-4 text-center font-black text-black transition hover:-translate-y-1 hover:bg-green-300"
          >
            Create Profile
          </a>

          <a
            href="/tournaments"
            className="rounded-xl border border-white/10 px-7 py-4 text-center font-black text-white transition hover:-translate-y-1 hover:border-green-400/40 hover:bg-white/5"
          >
            Browse Tournaments
          </a>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-500">
          <span>✓ Free Account</span>
          <span>✓ Multiple Games</span>
          <span>✓ Live Tournaments</span>
        </div>
      </div>

      {/* Hero Visual */}
      <div className="relative">
        <div className="absolute -inset-10 animate-pulse rounded-full bg-green-400/10 blur-3xl"></div>

<div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl transition duration-500 hover:-translate-y-2 hover:border-green-400/30">
          <div className="rounded-2xl border border-green-400/20 bg-black/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Live Competition
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  GameArena Battle
                </h3>
              </div>

<span className="flex items-center gap-2 rounded-full bg-green-400/10 px-3 py-1 text-xs font-black text-green-400">
  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
  LIVE
</span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-gray-500">
                  Players
                </p>

                <p className="mt-2 text-2xl font-black">
                  {playerCount}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-gray-500">
                  Tournaments
                </p>

                <p className="mt-2 text-2xl font-black">
                  {tournamentCount}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-green-400/20 bg-green-400/5 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-green-400">
                Ready to compete?
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Find a tournament and prove that you're the best.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

{/* Stats */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
          <div className="p-8 text-center">
            <p className="text-3xl font-black">{playerCount}+</p>
            <p className="mt-2 text-gray-500">Players</p>
          </div>

          <div className="p-8 text-center">
            <p className="text-3xl font-black">{tournamentCount}+</p>
            <p className="mt-2 text-gray-500">Tournaments</p>
          </div>

          <div className="p-8 text-center">
            <p className="text-3xl font-black">{matchCount}+</p>
            <p className="mt-2 text-gray-500">Matches</p>
          </div>

          <div className="p-8 text-center">
            <p className="text-3xl font-black">24/7</p>
            <p className="mt-2 text-gray-500">Competition</p>
          </div>
        </div>
      </section>

      {/* Tournaments */}
<section className="border-t border-white/10">
  <div className="mx-auto max-w-7xl px-6 py-20">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-green-400">
          Compete now
        </p>

        <h2 className="mt-2 text-4xl font-black md:text-5xl">
          Featured Tournaments
        </h2>

        <p className="mt-4 max-w-2xl text-gray-400">
          Pick your game, join a tournament and compete for the top spot.
        </p>
      </div>

      <a
        href="/tournaments"
        className="w-fit rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white no-underline transition hover:border-green-400/40 hover:bg-white/5"
      >
        View All Tournaments →
      </a>
    </div>

    <div className="mt-10 grid gap-6 md:grid-cols-3">
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

        const registrationOpen =
          tournament.registration_status !== "closed";

        return (
          <div
            key={tournament.id}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition duration-300 hover:-translate-y-1 hover:border-green-400/30 hover:bg-white/[0.05]"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <span className="rounded-full bg-green-400/10 px-3 py-1 text-xs font-black text-green-400">
                {tournament.game}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  status === "LIVE"
                    ? "bg-red-400/10 text-red-400"
                    : status === "COMPLETED"
                    ? "bg-gray-400/10 text-gray-400"
                    : "bg-blue-400/10 text-blue-400"
                }`}
              >
                {status}
              </span>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <h3 className="text-2xl font-black text-white">
                {tournament.title}
              </h3>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Entry Fee
                  </p>

                  <p className="mt-2 text-xl font-black text-white">
                    ₹{tournament.entry_fee}
                  </p>
                </div>

                <div className="rounded-xl border border-green-400/10 bg-green-400/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Prize Pool
                  </p>

                  <p className="mt-2 text-xl font-black text-green-400">
                    ₹{tournament.prize_pool}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Players
                  </p>

<p className="mt-1 font-bold text-white">
  {tournamentPlayerCounts[tournament.id] || 0} /{" "}
  {tournament.max_players}
</p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Starts
                  </p>

                  <p className="mt-1 text-sm font-bold text-white">
                    {startTime.toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <span
                  className={`text-xs font-bold ${
                    registrationOpen
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {registrationOpen
                    ? "● Registration Open"
                    : "● Registration Closed"}
                </span>
              </div>

              <a
                href={`/tournaments/${tournament.id}`}
                className="mt-6 block w-full rounded-xl bg-green-400 py-3 text-center font-black text-black no-underline transition group-hover:bg-green-300"
              >
                View Tournament
              </a>
            </div>
          </div>
        );
      })}

      {tournaments.length === 0 && (
        <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-lg font-bold text-white">
            No tournaments available
          </p>

          <p className="mt-2 text-gray-500">
            New tournaments will appear here when they are created.
          </p>
        </div>
      )}
    </div>
  </div>
</section>

{/* Recent Winners */}
<section className="border-t border-white/10">
  <div className="mx-auto max-w-7xl px-6 py-20">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-green-400">
          Top Players
        </p>

        <h2 className="mt-2 text-4xl font-black md:text-5xl">
          🏆 Recent Winners
        </h2>

        <p className="mt-4 max-w-2xl text-gray-400">
          See who is dominating the GameArena tournaments.
        </p>
      </div>

      <a
        href="/tournaments"
        className="w-fit rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white no-underline transition hover:border-green-400/40 hover:bg-white/5"
      >
        View Tournaments →
      </a>
    </div>

    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {winners.map((winner, index) => (
        <div
          key={winner.id}
          className="group relative overflow-hidden rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/40 hover:bg-yellow-400/[0.07]"
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-400/10 blur-3xl transition group-hover:bg-yellow-400/20"></div>

          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10 text-3xl">
                {index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : "🥉"}
              </div>

              <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-yellow-400">
                Winner
              </span>
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-widest text-gray-500">
              Champion
            </p>

            <h3 className="mt-2 truncate text-2xl font-black text-white">
              {winner.username}
            </h3>

            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Prize Won
                </p>

                <p className="mt-1 text-2xl font-black text-green-400">
                  ₹{winner.prize}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Rank
                </p>

                <p className="mt-1 font-black text-yellow-400">
                  #{winner.position}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {winners.length === 0 && (
        <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <div className="text-4xl">🏆</div>

          <p className="mt-4 text-lg font-bold text-white">
            No winners yet
          </p>

          <p className="mt-2 text-gray-500">
            Winners will appear here after tournaments are completed.
          </p>
        </div>
      )}
    </div>
  </div>
</section>

{/* How It Works */}
<section
  id="how-it-works"
  className="border-t border-white/10 bg-white/[0.02]"
>
  <div className="mx-auto max-w-7xl px-6 py-20">
    <div className="max-w-2xl">
      <p className="text-sm font-bold uppercase tracking-widest text-green-400">
        Simple & easy
      </p>

      <h2 className="mt-2 text-4xl font-black">
        How It Works
      </h2>

      <p className="mt-4 text-gray-400">
        Join GameArena and start competing in just a few simple steps.
      </p>
    </div>

    <div className="mt-12 grid gap-6 md:grid-cols-4">
      {[
        {
          number: "01",
          icon: "👤",
          title: "Create Account",
          description:
            "Register your GameArena account and create your gaming profile.",
        },
        {
          number: "02",
          icon: "🎮",
          title: "Join Tournament",
          description:
            "Browse available tournaments and join the competition you want.",
        },
        {
          number: "03",
          icon: "⚔️",
          title: "Play & Compete",
          description:
            "Enter the match, compete against other players and give your best.",
        },
        {
          number: "04",
          icon: "🏆",
          title: "Win Rewards",
          description:
            "Check the leaderboard, results and your tournament winnings.",
        },
      ].map((step) => (
        <div
          key={step.number}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-green-400/30 hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">
              {step.icon}
            </span>

            <span className="text-sm font-black text-green-400">
              {step.number}
            </span>
          </div>

          <h3 className="mt-6 text-xl font-black">
            {step.title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>

{/* Footer */}
<footer className="border-t border-white/10 bg-black">
  <div className="mx-auto max-w-7xl px-6 py-14">
    <div className="grid gap-10 md:grid-cols-4">

      {/* Brand */}
      <div className="md:col-span-2">
        <h2 className="text-2xl font-black">
          GAME<span className="text-green-400">ARENA</span>
        </h2>

        <p className="mt-4 max-w-md leading-7 text-gray-500">
          A competitive gaming platform where players can join
          tournaments, compete with others and win exciting rewards.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-400">
            🎮 Gaming
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-400">
            🏆 Tournaments
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-400">
            ⚡ Competition
          </span>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="font-black text-white">
          Quick Links
        </h3>

        <div className="mt-5 space-y-3">
          <a
            href="/"
            className="block text-sm text-gray-500 transition hover:text-green-400"
          >
            Home
          </a>

          <a
            href="/tournaments"
            className="block text-sm text-gray-500 transition hover:text-green-400"
          >
            Tournaments
          </a>

          <a
            href="/tournaments"
            className="block text-sm text-gray-500 transition hover:text-green-400"
          >
            Leaderboard
          </a>

          <a
            href="#how-it-works"
            className="block text-sm text-gray-500 transition hover:text-green-400"
          >
            How It Works
          </a>
        </div>
      </div>

      {/* Account */}
      <div>
        <h3 className="font-black text-white">
          Account
        </h3>

        <div className="mt-5 space-y-3">
          <a
            href="/login"
            className="block text-sm text-gray-500 transition hover:text-green-400"
          >
            Login
          </a>

          <a
            href="/register"
            className="block text-sm text-gray-500 transition hover:text-green-400"
          >
            Register
          </a>

          <a
            href="/dashboard"
            className="block text-sm text-gray-500 transition hover:text-green-400"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>

    {/* Bottom */}
    <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
<p>
  © 2026 GameArena. All rights reserved. Created by{" "}
  <span className="font-bold text-green-400">
    Ritesh❤️
  </span>
  .
</p>

      <p>
        Built for gamers. <span className="text-green-400">●</span> Made to compete.
      </p>
    </div>
  </div>
</footer>
    </main>
  );
}