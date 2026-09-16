"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  registration_status?: string;
  is_private?: boolean;
};

type TournamentResult = {
  id: string;
  username: string;
  position: number;
  prize: number;
};

type Player = {
  id: string;
  player_id: string;
  username: string;
  game_id: string;
};

type TournamentRoom = {
  room_id: string;
  room_password: string;
};

export default function TournamentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [room, setRoom] = useState<TournamentRoom | null>(null);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [message, setMessage] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadTournament();
  }, [tournamentId]);

  useEffect(() => {
    if (!tournament) return;

    const currentTournament = tournament;

    function updateCountdown() {
      const now = new Date().getTime();
      const start = new Date(currentTournament.start_time).getTime();
      const end = new Date(currentTournament.end_time).getTime();

      if (now < start) {
        const difference = start - now;

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

        setTimeLeft(
          `${days}d ${hours}h ${minutes}m ${seconds}s`
        );
      } else if (now < end) {
        setTimeLeft("LIVE");
      } else {
        setTimeLeft("ENDED");
      }
    }

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [tournament]);

  async function loadTournament() {
    setLoading(true);
    setAccessDenied(false);
    setTournament(null);
    setPlayers([]);
    setResults([]);
    setRoom(null);
    setIsJoined(false);

    const { data: publicTournament, error: publicTournamentError } =
      await supabase
        .from("tournaments")
        .select(
          "id, title, game, entry_fee, prize_pool, max_players, start_time, end_time, status, registration_status, is_private"
        )
        .eq("id", tournamentId)
        .maybeSingle();

    if (publicTournamentError) {
      console.error(
        "Public tournament loading error:",
        publicTournamentError
      );
    }

    let tournamentData = publicTournament;

    /*
      Private tournaments are intentionally not fetched directly
      because the database RLS policy blocks direct access.

      The private access page handles number + password verification.
      Until a secure access-token flow is added, private tournament
      details remain protected.
    */

if (!tournamentData) {
  setAccessDenied(true);
  setLoading(false);
  return;
}
    if (!tournamentData) {
      setTournament(null);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date();
    const startTime = new Date(tournamentData.start_time);
    const endTime = new Date(tournamentData.end_time);

    let currentStatus = "upcoming";

    if (now >= endTime) {
      currentStatus = "completed";
    } else if (now >= startTime) {
      currentStatus = "live";
    }

    setTournament({
      ...tournamentData,
      status: currentStatus,
    });

    const { data: playerData, error: playerError } =
      await supabase
        .from("tournament_players")
        .select("id, player_id, username, game_id")
        .eq("tournament_id", tournamentId)
        .order("joined_at", { ascending: true });

    const loadedPlayers = playerData || [];

    if (playerError) {
      console.error("Players error:", playerError);
    }

    setPlayers(loadedPlayers);

    if (user) {
      const joined = loadedPlayers.some(
        (player) => player.player_id === user.id
      );

      setIsJoined(joined);

      if (joined) {
        const { data: roomData, error: roomError } =
          await supabase
            .from("tournament_rooms")
            .select("room_id, room_password")
            .eq("tournament_id", tournamentId)
            .maybeSingle();

        if (roomError) {
          console.error("Room loading error:", roomError);
          setRoom(null);
        } else {
          setRoom(roomData);
        }
      } else {
        setRoom(null);
      }
    } else {
      setIsJoined(false);
      setRoom(null);
    }

    const { data: resultData, error: resultError } =
      await supabase
        .from("tournament_results")
        .select("id, username, position, prize")
        .eq("tournament_id", tournamentId)
        .order("position", { ascending: true });

    if (resultError) {
      console.error("Results error:", resultError);
      setResults([]);
    } else {
      setResults(resultData || []);
    }

    setLoading(false);
  }

  async function handleJoin() {
    setMessage("");
    setJoining(true);

    if (!tournament) {
      setJoining(false);
      return;
    }

    if (tournament.status !== "upcoming") {
      setMessage("This tournament is not open for joining.");
      setJoining(false);
      return;
    }

    if (tournament.registration_status === "closed") {
      setMessage("Registration for this tournament is closed.");
      setJoining(false);
      return;
    }

    if (players.length >= tournament.max_players) {
      setMessage("This tournament is full.");
      setJoining(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please login before joining.");
      setJoining(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("username, game_id")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
      setMessage("Your player profile could not be found.");
      setJoining(false);
      return;
    }

    const { error } = await supabase
      .from("tournament_players")
      .insert({
        tournament_id: tournamentId,
        player_id: user.id,
        username: profile.username,
        game_id: profile.game_id,
      });

    if (error) {
      if (error.code === "23505") {
        setMessage("You have already joined this tournament.");
      } else {
        console.error("Join error:", error);
        setMessage("Unable to join tournament.");
      }

      setJoining(false);
      return;
    }

    setMessage("You joined the tournament successfully! 🏆");

    const newPlayerCount = players.length + 1;

    if (newPlayerCount >= tournament.max_players) {
      await supabase
        .from("tournaments")
        .update({
          registration_status: "closed",
        })
        .eq("id", tournamentId);
    }

    await loadTournament();

    setJoining(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b12] text-white">
        <p className="text-gray-400">
          Loading tournament...
        </p>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b12] px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">

          <div className="text-5xl">
            🔐
          </div>

          <h1 className="mt-5 text-2xl font-black">
            Private Tournament
          </h1>

          <p className="mt-3 text-gray-400">
            You do not have access to this tournament.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Enter the tournament number and password provided by the organizer.
          </p>

          <button
            onClick={() => router.push("/tournaments/private")}
            className="mt-6 w-full rounded-xl bg-green-400 py-3.5 font-black text-black transition hover:bg-green-300"
          >
            Join Private Tournament
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="mt-3 w-full rounded-xl border border-white/10 py-3.5 font-black transition hover:border-green-400 hover:text-green-400"
          >
            ← Back to Dashboard
          </button>

        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b12] text-white">
        <div className="text-center">

          <p className="text-gray-400">
            Tournament not found.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-xl border border-white/10 px-5 py-3 text-sm font-bold transition hover:border-green-400 hover:text-green-400"
          >
            ← Back to Dashboard
          </button>

        </div>
      </main>
    );
  }

  const isFull =
    players.length >= tournament.max_players;

  return (
    <main className="min-h-screen bg-[#080b12] px-6 py-8 text-white">

      <div className="mx-auto max-w-5xl">

        {/* Header */}

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
            ← Back to Dashboard
          </a>

        </header>

        {/* Tournament Header */}

        <section className="py-12">

          <p className="text-sm font-bold uppercase tracking-widest text-green-400">
            {tournament.game}
          </p>

          <h1 className="mt-3 text-4xl font-black">
            {tournament.title}
          </h1>

          <p className="mt-3 text-gray-400">
            Tournament details and registered players.
          </p>

        </section>

        {/* Leaderboard */}

        {results.length > 0 && (
          <section className="mb-10 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-6">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-2xl font-black">
                  🏆 Leaderboard
                </h2>

                <p className="mt-2 text-gray-400">
                  Final tournament standings and prize distribution
                </p>

              </div>

              <div className="rounded-xl bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-400">
                {results.length} Players
              </div>

            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">

              <div className="grid grid-cols-12 border-b border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">

                <div className="col-span-2">
                  Rank
                </div>

                <div className="col-span-6">
                  Player
                </div>

                <div className="col-span-4 text-right">
                  Prize
                </div>

              </div>

              <div className="divide-y divide-white/5">

                {results.map((result) => (
                  <div
                    key={result.id}
                    className="grid grid-cols-12 items-center px-4 py-4 transition hover:bg-white/5"
                  >

                    <div className="col-span-2">

                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${
                          result.position === 1
                            ? "bg-yellow-400 text-black"
                            : result.position === 2
                            ? "bg-gray-300 text-black"
                            : result.position === 3
                            ? "bg-orange-400 text-black"
                            : "bg-white/10 text-white"
                        }`}
                      >

                        {result.position === 1
                          ? "🥇"
                          : result.position === 2
                          ? "🥈"
                          : result.position === 3
                          ? "🥉"
                          : result.position}

                      </div>

                    </div>

                    <div className="col-span-6">

                      <p className="font-black text-white">
                        {result.username}
                      </p>

                      <p className="text-sm text-gray-500">

                        {result.position === 1
                          ? "1st Place"
                          : result.position === 2
                          ? "2nd Place"
                          : result.position === 3
                          ? "3rd Place"
                          : `${result.position}th Place`}

                      </p>

                    </div>

                    <div className="col-span-4 text-right">

                      <p className="font-black text-green-400">
                        ₹{result.prize}
                      </p>

                    </div>

                  </div>
                ))}

              </div>

            </div>

          </section>
        )}

        {/* Message */}

        {message && (
          <div className="mb-6 rounded-xl border border-green-400/20 bg-green-400/10 p-4 text-center font-bold text-green-400">
            {message}
          </div>
        )}

        {/* Main Tournament Sections */}

        <section className="grid gap-5 md:grid-cols-2">

          {/* Tournament Information */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <h2 className="text-xl font-black">
              Tournament Information
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-4">

              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-xs text-gray-500">
                  Entry Fee
                </p>

                <p className="mt-1 text-xl font-black">
                  ₹{tournament.entry_fee}
                </p>

              </div>

              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-xs text-gray-500">
                  Prize Pool
                </p>

                <p className="mt-1 text-xl font-black text-green-400">
                  ₹{tournament.prize_pool}
                </p>

              </div>

              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-xs text-gray-500">
                  Players
                </p>

                <p className="mt-1 text-xl font-black">
                  {players.length} / {tournament.max_players}
                </p>

              </div>

              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-xs text-gray-500">
                  Status
                </p>

                <p
                  className={`mt-1 text-xl font-black ${
                    tournament.status === "live"
                      ? "text-red-400"
                      : tournament.status === "completed"
                      ? "text-gray-400"
                      : "text-green-400"
                  }`}
                >
                  {tournament.status.toUpperCase()}
                </p>

              </div>

            </div>

            <div className="mt-4 rounded-xl bg-black/20 p-4">

              <p className="text-xs text-gray-500">
                Tournament Starts
              </p>

              <p className="mt-1 font-bold">
                {new Date(
                  tournament.start_time
                ).toLocaleString()}
              </p>

            </div>

            <div className="mt-4 rounded-xl bg-black/20 p-4">

              <p className="text-xs text-gray-500">
                Tournament Ends
              </p>

              <p className="mt-1 font-bold">
                {new Date(
                  tournament.end_time
                ).toLocaleString()}
              </p>

            </div>

            <div className="mt-4 rounded-xl border border-green-400/20 bg-green-400/10 p-4">

              <p className="text-xs font-bold uppercase tracking-wider text-green-400">

                {tournament.status === "upcoming"
                  ? "Starts In"
                  : tournament.status === "live"
                  ? "Ends In"
                  : "Tournament Status"}

              </p>

              <p className="mt-2 text-2xl font-black text-green-400">
                {timeLeft}
              </p>

            </div>

            <button
              onClick={handleJoin}
              disabled={
                joining ||
                isJoined ||
                isFull ||
                tournament.status !== "upcoming" ||
                tournament.registration_status === "closed"
              }
              className={`mt-6 w-full rounded-xl py-4 font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isJoined
                  ? "bg-gray-600 text-white"
                  : "bg-green-400 text-black hover:bg-green-300"
              }`}
            >

              {isJoined
                ? "Already Joined"
                : tournament.registration_status === "closed"
                ? "Registration Closed"
                : isFull
                ? "Tournament Full"
                : tournament.status === "live"
                ? "Tournament Live"
                : tournament.status === "completed"
                ? "Tournament Completed"
                : joining
                ? "Joining..."
                : "Join Tournament"}

            </button>

          </div>

          {/* Registered Players */}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            {/* Room Details */}

            {isJoined && room && (
              <div className="mb-8 rounded-2xl border border-green-400/20 bg-green-400/5 p-6">

                <p className="text-sm font-bold uppercase tracking-widest text-green-400">
                  Room Details
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">

                  <div className="rounded-xl bg-black/20 p-4">

                    <p className="text-xs text-gray-500">
                      Room ID
                    </p>

                    <p className="mt-2 text-lg font-black">
                      {room.room_id}
                    </p>

                  </div>

                  <div className="rounded-xl bg-black/20 p-4">

                    <p className="text-xs text-gray-500">
                      Password
                    </p>

                    <p className="mt-2 text-lg font-black">
                      {room.room_password}
                    </p>

                  </div>

                </div>

              </div>
            )}

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-black">
                Registered Players
              </h2>

              <span className="rounded-full bg-green-400/10 px-3 py-1 text-sm font-bold text-green-400">
                {players.length}
              </span>

            </div>

            {players.length === 0 ? (

              <div className="mt-6 rounded-xl bg-black/20 p-8 text-center">

                <div className="text-3xl">
                  👤
                </div>

                <p className="mt-3 text-gray-500">
                  No players have joined yet.
                </p>

              </div>

            ) : (

              <div className="mt-5 space-y-3">

                {players.map((player, index) => (

                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-xl bg-black/20 p-4"
                  >

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-400 font-black text-black">
                        {index + 1}
                      </div>

                      <div>

                        <p className="font-bold">
                          {player.username}
                        </p>

                        <p className="text-xs text-gray-500">
                          ID: {player.game_id}
                        </p>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </section>

        {/* Game Room */}

        {tournament.status === "live" && isJoined && (
          <section className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-6">

            <h2 className="text-xl font-black text-red-400">
              🎮 Game Room
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              You are registered for this tournament. Use these details to enter the game room.
            </p>

            {room ? (

              <div className="mt-5 grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl bg-black/20 p-5">

                  <p className="text-xs text-gray-500">
                    Room ID
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {room.room_id}
                  </p>

                </div>

                <div className="rounded-xl bg-black/20 p-5">

                  <p className="text-xs text-gray-500">
                    Room Password
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {room.room_password}
                  </p>

                </div>

              </div>

            ) : (

              <div className="mt-5 rounded-xl bg-black/20 p-5 text-center text-gray-400">
                Room details are not available yet.
              </div>

            )}

          </section>
        )}

      </div>

    </main>
  );
}