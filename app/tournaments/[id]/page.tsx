"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  title: string;
  game: string;
  format: "solo" | "squad";
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
  const [isSquadCaptain, setIsSquadCaptain] = useState(false);
  const [captainSquadId, setCaptainSquadId] = useState<string | null>(null);
  const [memberSquadId, setMemberSquadId] = useState<string | null>(null);
  const [room, setRoom] = useState<TournamentRoom | null>(null);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [message, setMessage] = useState("");
  const [joining, setJoining] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

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
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (now < end) {
        setTimeLeft("LIVE NOW");
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

    const { data: publicTournament } = await supabase
      .from("tournaments")
      .select("id, title, game, format, entry_fee, prize_pool, max_players, start_time, end_time, status, registration_status, is_private")
      .eq("id", tournamentId)
      .maybeSingle();

    let tournamentData = publicTournament;

    if (!tournamentData) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let loadedCaptainSquadId: string | null = null;

    setIsSquadCaptain(false);
    setCaptainSquadId(null);
    setMemberSquadId(null);

    if (user && tournamentData.format === "squad") {
      const { data: captainSquad } = await supabase
        .from("tournament_squads")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("captain_id", user.id)
        .maybeSingle();

      if (!captainSquad) {
        const { data: memberSquadIdFromRpc } = await supabase.rpc("get_my_squad_id", {
          p_tournament_id: tournamentId,
        });

        if (memberSquadIdFromRpc) {
          setMemberSquadId(memberSquadIdFromRpc);
        }
      }

      if (captainSquad) {
        loadedCaptainSquadId = captainSquad.id;
        setIsSquadCaptain(true);
        setCaptainSquadId(captainSquad.id);
      }
    }

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

    const { data: playerData } = await supabase
      .from("tournament_players")
      .select("id, player_id, username, game_id")
      .eq("tournament_id", tournamentId)
      .order("joined_at", { ascending: true });

    const loadedPlayers = playerData || [];
    setPlayers(loadedPlayers);

    if (user) {
      const joinedAsPlayer = loadedPlayers.some((player) => player.player_id === user.id);
      const joinedAsSquadCaptain = tournamentData.format === "squad" && loadedCaptainSquadId !== null;

      const joined = joinedAsPlayer || joinedAsSquadCaptain;
      setIsJoined(joined);

      if (joined) {
        const { data: roomData } = await supabase
          .from("tournament_rooms")
          .select("room_id, room_password")
          .eq("tournament_id", tournamentId)
          .maybeSingle();

        setRoom(roomData);
      }
    }

    const { data: resultData } = await supabase
      .from("tournament_results")
      .select("id, username, position, prize")
      .eq("tournament_id", tournamentId)
      .order("position", { ascending: true });

    setResults(resultData || []);

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

    const { data: latestTournament } = await supabase
      .from("tournaments")
      .select("id, format, max_players, registration_status")
      .eq("id", tournamentId)
      .maybeSingle();

    if (!latestTournament) {
      setMessage("Unable to verify tournament details.");
      setJoining(false);
      return;
    }

    if (latestTournament.format === "squad") {
      router.push(`/tournaments/${tournamentId}/squad`);
      setJoining(false);
      return;
    }

    if (latestTournament.registration_status === "closed") {
      setMessage("Registration for this tournament is closed.");
      setJoining(false);
      return;
    }

    if (players.length >= latestTournament.max_players) {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, game_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      setMessage("Your player profile could not be found.");
      setJoining(false);
      return;
    }

    const { error } = await supabase.from("tournament_players").insert({
      tournament_id: tournamentId,
      player_id: user.id,
      username: profile.username,
      game_id: profile.game_id,
    });

    if (error) {
      if (error.code === "23505") {
        setMessage("You have already joined this tournament.");
      } else {
        setMessage("Unable to join tournament.");
      }
      setJoining(false);
      return;
    }

    setMessage("You joined the tournament successfully! 🏆");

    await loadTournament();
    setJoining(false);
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareMessage("Link copied to clipboard!");
      setTimeout(() => setShareMessage(""), 2000);
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 text-black">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
            <div className="grid gap-4 md:grid-cols-2 mt-8">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-black">
        <div className="mx-auto max-w-md text-center">
          <div className="text-5xl">🔐</div>
          <h1 className="mt-5 text-2xl font-bold">Private Tournament</h1>
          <p className="mt-3 text-gray-600">You do not have access to this tournament.</p>
          <p className="mt-2 text-sm text-gray-500">
            Enter the tournament number and password provided by the organizer.
          </p>

          <button
            onClick={() => router.push("/tournaments/private")}
            className="mt-6 w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500"
          >
            Join Private Tournament
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="mt-3 w-full rounded-lg border border-gray-300 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-black">
        <div className="mx-auto max-w-md text-center">
          <p className="text-gray-600">Tournament not found.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const isFull = players.length >= tournament.max_players;

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-black">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 pb-4">
          <a href="/" className="text-xl font-bold text-black no-underline">
            GAME<span className="text-green-600">ARENA</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              📤 Share
            </button>

            <a
              href="/dashboard"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 no-underline transition hover:bg-gray-50"
            >
              ← Dashboard
            </a>
          </div>
        </header>

        {shareMessage && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 text-center">
            {shareMessage}
          </div>
        )}

        {/* Tournament Header */}
        <section className="py-8">
          <p className="text-sm font-medium text-green-600">{tournament.game}</p>
          <h1 className="mt-2 text-3xl font-bold">{tournament.title}</h1>
          <p className="mt-2 text-gray-600">Tournament details and registered players.</p>
        </section>

        {/* Leaderboard */}
        {results.length > 0 && (
          <section className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">🏆 Leaderboard</h2>
                <p className="mt-1 text-sm text-gray-600">Final tournament standings</p>
              </div>
              <span className="rounded-lg bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                {results.length} Winners
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-yellow-200 bg-white">
              <div className="grid grid-cols-12 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                <div className="col-span-2">Rank</div>
                <div className="col-span-6">Player</div>
                <div className="col-span-4 text-right">Prize</div>
              </div>

              <div className="divide-y divide-gray-100">
                {results.map((result) => (
                  <div key={result.id} className="grid grid-cols-12 items-center px-4 py-4">
                    <div className="col-span-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                          result.position === 1
                            ? "bg-yellow-400 text-black"
                            : result.position === 2
                            ? "bg-gray-300 text-black"
                            : result.position === 3
                            ? "bg-orange-400 text-black"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {result.position === 1 ? "🥇" : result.position === 2 ? "🥈" : result.position === 3 ? "🥉" : result.position}
                      </div>
                    </div>
                    <div className="col-span-6">
                      <p className="font-semibold">{result.username}</p>
                      <p className="text-sm text-gray-500">
                        {result.position === 1 ? "1st Place" : result.position === 2 ? "2nd Place" : result.position === 3 ? "3rd Place" : `${result.position}th Place`}
                      </p>
                    </div>
                    <div className="col-span-4 text-right">
                      <p className="font-bold text-green-600">₹{result.prize}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Message */}
        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 text-center font-medium">
            {message}
          </div>
        )}

        {/* Main Tournament Sections */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Tournament Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold">Tournament Information</h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Format</p>
                <p className="mt-1 font-semibold text-blue-600">
                  {tournament.format === "squad" ? "Squad" : "Solo"}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Entry Fee</p>
                <p className="mt-1 font-semibold">₹{tournament.entry_fee}</p>
              </div>

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Prize Pool</p>
                <p className="mt-1 font-semibold text-green-600">₹{tournament.prize_pool}</p>
              </div>

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Players</p>
                <p className="mt-1 font-semibold">
                  {players.length} / {tournament.max_players}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Status</p>
                <p
                  className={`mt-1 font-semibold ${
                    tournament.status === "live"
                      ? "text-red-600"
                      : tournament.status === "completed"
                      ? "text-gray-600"
                      : "text-green-600"
                  }`}
                >
                  {tournament.status.toUpperCase()}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Registration</p>
                <p
                  className={`mt-1 font-semibold ${
                    tournament.registration_status === "closed" || isFull ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {tournament.registration_status === "closed" || isFull ? "CLOSED" : "OPEN"}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Start Time</p>
              <p className="mt-1 font-medium">{new Date(tournament.start_time).toLocaleString()}</p>
            </div>

            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">End Time</p>
              <p className="mt-1 font-medium">{new Date(tournament.end_time).toLocaleString()}</p>
            </div>

            {/* Countdown */}
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-600">
                {tournament.status === "upcoming" ? "Starts In" : tournament.status === "live" ? "Status" : "Tournament Ended"}
              </p>
              <p className="mt-1 text-xl font-bold text-green-600">{timeLeft}</p>
            </div>

            {/* Join Button */}
            {isJoined && tournament.format === "squad" && isSquadCaptain && captainSquadId ? (
              <button
                onClick={() => {
                  window.location.href = `/tournaments/${tournamentId}/squad/${captainSquadId}`;
                }}
                className="mt-4 w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500"
              >
                🎮 Manage Squad
              </button>
            ) : isJoined && tournament.format === "squad" && memberSquadId ? (
              <button
                onClick={() => {
                  window.location.href = `/tournaments/${tournamentId}/squad/${memberSquadId}`;
                }}
                className="mt-4 w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500"
              >
                👥 Open Squad
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={
                  joining ||
                  isFull ||
                  tournament.status !== "upcoming" ||
                  tournament.registration_status === "closed"
                }
                className={`mt-4 w-full rounded-lg py-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isJoined
                    ? "bg-gray-600 text-white"
                    : "bg-green-600 text-white hover:bg-green-500"
                }`}
              >
                {tournament.format === "squad"
                  ? tournament.registration_status === "closed"
                    ? "Registration Closed"
                    : isFull
                    ? "Tournament Full"
                    : tournament.status === "live"
                    ? "Tournament Live"
                    : tournament.status === "completed"
                    ? "Tournament Completed"
                    : joining
                    ? "Opening Squad..."
                    : "Join / Create Squad"
                  : isJoined
                  ? "✓ Already Joined"
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
            )}
          </div>

          {/* Registered Players */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            {/* Room Details */}
            {isJoined && room && (
              <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-600">Room Details</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">Room ID</p>
                    <p className="mt-1 font-semibold">{room.room_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Password</p>
                    <p className="mt-1 font-semibold">{room.room_password}</p>
                  </div>
                </div>
              </div>
            )}

            {!tournament.is_private && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Registered Players</h2>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-600">
                    {players.length}
                  </span>
                </div>

                {players.length === 0 ? (
                  <div className="mt-4 rounded-lg bg-gray-50 p-8 text-center">
                    <div className="text-3xl">👤</div>
                    <p className="mt-3 text-gray-600">No players have joined yet.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {players.map((player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{player.username}</p>
                          <p className="text-xs text-gray-500">ID: {player.game_id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Game Room */}
        {tournament.status === "live" && isJoined && (
          <section className="mt-4 rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-bold text-red-600">🎮 Game Room</h2>
            <p className="mt-1 text-sm text-gray-600">
              You are registered for this tournament. Use these details to enter the game room.
            </p>

            {room ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-gray-500">Room ID</p>
                  <p className="mt-1 text-lg font-bold">{room.room_id}</p>
                </div>
                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-gray-500">Room Password</p>
                  <p className="mt-1 text-lg font-bold">{room.room_password}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-white p-4 text-center text-gray-600">
                Room details are not available yet.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
