"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tournament = {
    registration_status?: string;
  id: string;
  title: string;
  game: string;
  entry_fee: number;
  prize_pool: number;
  max_players: number;
  start_time: string;
  end_time: string;
  status: string;
  room_id: string | null;
  room_password: string | null;
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [playerSearch, setPlayerSearch] = useState("");
  const [resultTournamentId, setResultTournamentId] = useState("");
const [resultPlayerId, setResultPlayerId] = useState("");
const [resultPosition, setResultPosition] = useState("1");
const [resultPrize, setResultPrize] = useState("");
const [savingResult, setSavingResult] = useState(false);
const tournamentsPerPage = 5;
const filteredTournaments = tournaments.filter((tournament) => {
  if (tournamentFilter !== "all") {
    const status = getTournamentStatus(
      tournament.start_time,
      tournament.end_time
    );

    if (status !== tournamentFilter) {
      return false;
    }
  }

  const search = tournamentSearch.toLowerCase().trim();

  if (!search) return true;

  return (
    tournament.title.toLowerCase().includes(search) ||
    tournament.game.toLowerCase().includes(search)
  );
});

const totalPages = Math.ceil(
  filteredTournaments.length / tournamentsPerPage
);

const paginatedTournaments = filteredTournaments.slice(
  (currentPage - 1) * tournamentsPerPage,
  currentPage * tournamentsPerPage
);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const totalPlayers = Object.values(playerCounts).reduce(
  (total, count) => total + count,
  0
);

const liveTournaments = tournaments.filter(
  (tournament) =>
    getTournamentStatus(
      tournament.start_time,
      tournament.end_time
    ) === "LIVE"
).length;

const upcomingTournaments = tournaments.filter(
  (tournament) =>
    getTournamentStatus(
      tournament.start_time,
      tournament.end_time
    ) === "UPCOMING"
).length;
  const [players, setPlayers] = useState<any[]>([]);
const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
const [savingEdit, setSavingEdit] = useState(false);

  const [title, setTitle] = useState("");
  const [game, setGame] = useState("BGMI");
  const [entryFee, setEntryFee] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("100");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [registrationStatus, setRegistrationStatus] =
  useState("open");

  useEffect(() => {
async function checkUser() {
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    window.location.href = "/login";
    return;
  }

  const ADMIN_USER_ID = "6431960a-b0c6-4e2a-8b1a-d5017ceae103";

  if (data.user.id !== ADMIN_USER_ID) {
    window.location.href = "/";
    return;
  }

  setUser(data.user);
  setLoading(false);

  loadTournaments();
  loadPlayers();
}
    checkUser();
  }, []);

 async function loadTournaments() {
  setLoadingTournaments(true);

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_time", { ascending: true });

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

  setPlayerCounts(counts);
}

  setLoadingTournaments(false);
}

  function getTournamentStatus(
    startTime: string,
    endTime: string
  ) {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (now < start) return "UPCOMING";
    if (now < end) return "LIVE";
    return "COMPLETED";
  }
  async function loadPlayers() {
  setLoadingPlayers(true);

  const { data, error } = await supabase
    .from("tournament_players")
.select(`
  id,
  player_id,
  username,
  game_id,
  joined_at,
  tournament_id,
  tournaments (
    title,
    game
  )
`)
    .order("joined_at", { ascending: false });

  if (!error && data) {
    setPlayers(data);
  }

  setLoadingPlayers(false);
}

  async function createTournament(e: React.FormEvent) {
    e.preventDefault();

    setCreating(true);
    setMessage("");

    const { data: tournament, error } = await supabase
      .from("tournaments")
      .insert({
        title,
        game,
        entry_fee: Number(entryFee),
        prize_pool: Number(prizePool),
        max_players: Number(maxPlayers),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
status: "upcoming",
registration_status: registrationStatus,
room_id: roomId,
room_password: roomPassword,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      setCreating(false);
      return;
    }

    if (tournament && roomId && roomPassword) {
      const { error: roomError } = await supabase
        .from("tournament_rooms")
        .insert({
          tournament_id: tournament.id,
          room_id: roomId,
          room_password: roomPassword,
        });

      if (roomError) {
        setMessage(
          "Tournament created, but room details could not be saved: " +
            roomError.message
        );
        setCreating(false);
        return;
      }
    }

    setMessage("Tournament created successfully!");

    setTitle("");
    setGame("BGMI");
    setEntryFee("");
    setPrizePool("");
    setMaxPlayers("100");
    setStartTime("");
    setEndTime("");
    setRoomId("");
    setRoomPassword("");
    setRegistrationStatus("open");

    await loadTournaments();

    setCreating(false);
  }

  async function deleteTournament(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this tournament?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Tournament deleted successfully.");

    await loadTournaments();
  }
function startEditing(tournament: Tournament) {
  setEditingId(tournament.id);

  setTitle(tournament.title);
  setGame(tournament.game);
  setEntryFee(String(tournament.entry_fee));
  setPrizePool(String(tournament.prize_pool));
  setMaxPlayers(String(tournament.max_players));

  const start = new Date(tournament.start_time);
  const end = new Date(tournament.end_time);

  setStartTime(
    new Date(start.getTime() - start.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );

  setEndTime(
    new Date(end.getTime() - end.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );

 setRoomId(tournament.room_id || "");
setRoomPassword(tournament.room_password || "");
setRegistrationStatus(tournament.registration_status || "open");

window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}
async function saveTournament(e: React.FormEvent) {
  e.preventDefault();

  if (!editingId) return;

  setSavingEdit(true);
  setMessage("");

  const { data: updatedTournament, error } = await supabase
    .from("tournaments")
    .update({
      title,
      game,
      entry_fee: Number(entryFee),
      prize_pool: Number(prizePool),
      max_players: Number(maxPlayers),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      registration_status: registrationStatus,
      room_id: roomId,
      room_password: roomPassword,
    })
    .eq("id", editingId)
    .select("registration_status")
    .single();

  if (error) {
    setMessage(error.message);
    setSavingEdit(false);
    return;
  }

  if (roomId && roomPassword) {
    const { data: existingRoom } = await supabase
      .from("tournament_rooms")
      .select("id")
      .eq("tournament_id", editingId)
      .maybeSingle();

    if (existingRoom) {
      await supabase
        .from("tournament_rooms")
        .update({
          room_id: roomId,
          room_password: roomPassword,
        })
        .eq("tournament_id", editingId);
    } else {
      await supabase
        .from("tournament_rooms")
        .insert({
          tournament_id: editingId,
          room_id: roomId,
          room_password: roomPassword,
        });
    }
  }

  setRegistrationStatus(
    updatedTournament?.registration_status || "open"
  );

  setMessage(
    `Tournament updated successfully! Registration: ${
      updatedTournament?.registration_status || "open"
    }`
  );

  setEditingId(null);

  await loadTournaments();

  setSavingEdit(false);
}

  

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-black">Admin Access</h1>

          <p className="mt-3 text-gray-400">
            Please login to access the admin dashboard.
          </p>

          <a
            href="/login"
            className="mt-6 inline-block rounded-xl bg-green-500 px-6 py-3 font-bold text-black no-underline"
          >
            Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a
            href="/"
            className="text-2xl font-black tracking-tight text-green-400 no-underline"
          >
            GAMEARENA
          </a>

          <a
            href="/dashboard"
            className="text-sm font-semibold text-gray-300 no-underline hover:text-white"
          >
            Dashboard
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-black">
          Admin Dashboard
        </h1>
        {/* Admin Statistics */}
<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
    <p className="text-sm text-gray-400">
      Total Tournaments
    </p>

    <p className="mt-2 text-3xl font-black">
      {tournaments.length}
    </p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
    <p className="text-sm text-gray-400">
      Total Registered Players
    </p>

    <p className="mt-2 text-3xl font-black">
      {totalPlayers}
    </p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
    <p className="text-sm text-gray-400">
      Live Tournaments
    </p>

    <p className="mt-2 text-3xl font-black">
      {liveTournaments}
    </p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
    <p className="text-sm text-gray-400">
      Upcoming Tournaments
    </p>

    <p className="mt-2 text-3xl font-black">
      {upcomingTournaments}
    </p>
  </div>
</div>

        <p className="mt-3 text-gray-400">
          Create and manage GameArena tournaments.
        </p>

        {/* Create Tournament */}
        <div className="mt-10">
          <h2 className="text-2xl font-black">
            Create Tournament
          </h2>

          <form
            onSubmit={editingId ? saveTournament : createTournament}
            className="mt-6 space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div>
              <label className="text-sm font-semibold text-gray-300">
                Tournament Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="GameArena Battle #2"
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-300">
                Game
              </label>

              <select
                value={game}
                onChange={(e) => setGame(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
              >
                <option value="BGMI">BGMI</option>
                <option value="Free Fire">Free Fire</option>
                <option value="Call of Duty Mobile">
                  Call of Duty Mobile
                </option>
                <option value="Valorant">Valorant</option>
              </select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Entry Fee (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  placeholder="50"
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Prize Pool (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                  placeholder="5000"
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-300">
                Maximum Players
              </label>

              <input
                type="number"
                min="1"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Tournament Start
                </label>

                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Tournament End
                </label>

                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-xl font-bold">
                Game Room
              </h3>

              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-300">
                    Room ID
                  </label>

                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="12345678"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-300">
                    Room Password
                  </label>

                  <input
                    type="text"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    placeholder="GAME123"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
                  />
                </div>
                <div>
  <label className="mb-2 block text-sm font-bold text-gray-300">
    Registration Status
  </label>

  <select
    value={registrationStatus}
    onChange={(e) => setRegistrationStatus(e.target.value)}
    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
  >
    <option value="open" className="bg-gray-900">
      Open
    </option>

    <option value="closed" className="bg-gray-900">
      Closed
    </option>
  </select>
</div>
              </div>
            </div>

            {message && (
              <div className="rounded-xl border border-green-400/20 bg-green-400/10 p-4 text-sm text-green-400">
                {message}
              </div>
            )}

<button
  type="submit"
  disabled={creating || savingEdit}
              className="w-full rounded-xl bg-green-500 px-6 py-4 font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
{editingId
  ? savingEdit
    ? "Saving Changes..."
    : "Save Changes"
  : creating
  ? "Creating Tournament..."
  : "Create Tournament"}
            </button>
          </form>
        </div>

        {/* Tournament Management */}
        <div className="mt-16">
          <h2 className="text-2xl font-black">
            Manage Tournaments
          </h2>
          <div className="mt-5">
  <input
    type="text"
    value={tournamentSearch}
    onChange={(e) => setTournamentSearch(e.target.value)}
    placeholder="Search tournaments..."
    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-green-400"
  />
</div>
          <div className="mt-5 flex flex-wrap gap-3">
  {[
    { value: "all", label: "All" },
    { value: "UPCOMING", label: "Upcoming" },
    { value: "LIVE", label: "Live" },
    { value: "COMPLETED", label: "Completed" },
  ].map((filter) => (
    <button
      key={filter.value}
      type="button"
      onClick={() => setTournamentFilter(filter.value)}
      className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
        tournamentFilter === filter.value
          ? "bg-green-400 text-black"
          : "border border-white/10 bg-white/5 text-gray-300 hover:border-green-400/40"
      }`}
    >
      {filter.label}
    </button>
  ))}
</div>

          {loadingTournaments ? (
            <p className="mt-6 text-gray-400">
              Loading tournaments...
            </p>
          ) : tournaments.length === 0 ? (
            <p className="mt-6 text-gray-400">
              No tournaments found.
            </p>
          ) : (
        
            
            <div className="mt-6 space-y-5">
        
{paginatedTournaments.map((tournament) => {
                const status = getTournamentStatus(
                  tournament.start_time,
                  tournament.end_time
                );

                return (
                  <div
                    key={tournament.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-black">
                            {tournament.title}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              status === "LIVE"
                                ? "bg-green-400/10 text-green-400"
                                : status === "UPCOMING"
                                ? "bg-yellow-400/10 text-yellow-400"
                                : "bg-gray-400/10 text-gray-400"
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-400">
                          {tournament.game}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button
  onClick={() => startEditing(tournament)}
  className="rounded-xl bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-400 hover:bg-blue-500/20"
>
  Edit
</button>
                        <a
                          href={`/tournaments/${tournament.id}`}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white no-underline hover:bg-white/10"
                        >
                          View
                        </a>

                        <button
                          onClick={() =>
                            deleteTournament(tournament.id)
                          }
                          className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-gray-500">
                          Entry Fee
                        </p>

                        <p className="mt-1 font-bold">
                          ₹{tournament.entry_fee}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Prize Pool
                        </p>

                        <p className="mt-1 font-bold">
                          ₹{tournament.prize_pool}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Maximum Players
                        </p>

                        <p className="mt-1 font-bold">
                          {tournament.max_players}
                        </p>
                      </div>
                      <div>
  <p className="text-xs text-gray-500">
    Registered Players
  </p>

  <p className="mt-1 font-bold">
    {playerCounts[tournament.id] || 0} / {tournament.max_players}
  </p>
</div>
<div>
  <p className="text-xs text-gray-500">
    Spots Remaining
  </p>

  <p className="mt-1 font-bold">
    {Math.max(
      tournament.max_players -
        (playerCounts[tournament.id] || 0),
      0
    )}
  </p>
</div>
<div>
  <p className="text-xs text-gray-500">
    Registration
  </p>

  <p
    className={`mt-1 font-bold ${
      tournament.registration_status === "closed" ||
      (playerCounts[tournament.id] || 0) >=
        tournament.max_players
        ? "text-red-400"
        : "text-green-400"
    }`}
  >
    {tournament.registration_status === "closed"
      ? "CLOSED"
      : (playerCounts[tournament.id] || 0) >=
        tournament.max_players
      ? "FULL"
      : "OPEN"}
  </p>
</div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Start
                        </p>

                        <p className="mt-1 font-bold">
                          {new Date(
                            tournament.start_time
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {totalPages > 1 && (
  <div className="mt-6 flex items-center justify-center gap-3">
    <button
      type="button"
      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
      disabled={currentPage === 1}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white transition hover:border-green-400/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Previous
    </button>

    <span className="px-3 text-sm font-bold text-gray-400">
      Page {currentPage} of {totalPages}
    </span>

    <button
      type="button"
      onClick={() =>
        setCurrentPage((page) => Math.min(totalPages, page + 1))
      }
      disabled={currentPage === totalPages}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white transition hover:border-green-400/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Next
    </button>
  </div>
)}
            </div>
          )}
        </div>
        {/* Tournament Results */}
<div className="mt-16">
  <h2 className="text-2xl font-black">
    Tournament Results
  </h2>

  <p className="mt-2 text-gray-400">
    Add winners and prizes for completed tournaments.
  </p>

  <form
    onSubmit={async (e) => {
      e.preventDefault();

      if (
        !resultTournamentId ||
        !resultPlayerId ||
        !resultPosition
      ) {
        setMessage("Please select tournament, player and position.");
        return;
      }

      setSavingResult(true);
      setMessage("");

  const selectedPlayer = players.find(
  (player) => player.player_id === resultPlayerId
);

      if (!selectedPlayer) {
        setMessage("Player not found.");
        setSavingResult(false);
        return;
      }

 const { error } = await supabase
  .from("tournament_results")
  .insert({
    tournament_id: resultTournamentId,
    player_id: selectedPlayer.player_id,
    username: selectedPlayer.username,
    position: Number(resultPosition),
    prize: Number(resultPrize || 0),
  });

      if (error) {
        setMessage(error.message);
        setSavingResult(false);
        return;
      }

      setMessage("Tournament result added successfully!");

      setResultPlayerId("");
      setResultPosition("1");
      setResultPrize("");

      setSavingResult(false);
    }}
    className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6"
  >
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <label className="text-sm font-semibold text-gray-300">
          Tournament
        </label>

        <select
          value={resultTournamentId}
          onChange={(e) => {
            setResultTournamentId(e.target.value);
            setResultPlayerId("");
          }}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
        >
          <option value="">
            Select Tournament
          </option>

          {tournaments.map((tournament) => (
            <option
              key={tournament.id}
              value={tournament.id}
            >
              {tournament.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-300">
  Player
</label>

<select
  value={resultPlayerId}
  onChange={(e) => setResultPlayerId(e.target.value)}
  disabled={!resultTournamentId}
  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400 disabled:opacity-50"
>
  <option value="">
    Select Player
  </option>

  {players
    .filter((player) => {
      const tournamentData = Array.isArray(player.tournaments)
        ? player.tournaments[0]
        : player.tournaments;

      const selectedTournament = tournaments.find(
        (tournament) => tournament.id === resultTournamentId
      );

      return tournamentData?.title === selectedTournament?.title;
    })
    .map((player) => (
      <option
        key={player.id}
        value={player.player_id}
      >
        {player.username} — {player.game_id}
      </option>
    ))}
</select>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-300">
          Position
        </label>

        <select
          value={resultPosition}
          onChange={(e) =>
            setResultPosition(e.target.value)
          }
          className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-green-400"
        >
          <option value="1">1st Place</option>
          <option value="2">2nd Place</option>
          <option value="3">3rd Place</option>
          <option value="4">4th Place</option>
          <option value="5">5th Place</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-300">
          Prize
        </label>

        <input
          type="number"
          min="0"
          value={resultPrize}
          onChange={(e) =>
            setResultPrize(e.target.value)
          }
          placeholder="Prize amount"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-green-400"
        />
      </div>
    </div>

    <button
      type="submit"
      disabled={savingResult}
      className="mt-6 w-full rounded-xl bg-green-400 py-3 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {savingResult
        ? "Saving Result..."
        : "Add Result"}
    </button>
  </form>
</div>
        {/* Registered Players */}
<div className="mt-16">
  <h2 className="text-2xl font-black">
    Registered Players
  </h2>
  <div className="mt-5">
  <input
    type="text"
    value={playerSearch}
    onChange={(e) => setPlayerSearch(e.target.value)}
    placeholder="Search players..."
    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-green-400"
  />
</div>

  <p className="mt-2 text-gray-400">
    Players who have joined your tournaments.
  </p>

  {loadingPlayers ? (
    <p className="mt-6 text-gray-400">
      Loading players...
    </p>
  ) : players.length === 0 ? (
    <p className="mt-6 text-gray-400">
      No registered players yet.
    </p>
  ) : (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table className="w-full min-w-[700px] text-left">
        <thead className="border-b border-white/10">
          <tr>
            <th className="px-5 py-4 text-sm text-gray-400">
              Player
            </th>

            <th className="px-5 py-4 text-sm text-gray-400">
              Game ID
            </th>

            <th className="px-5 py-4 text-sm text-gray-400">
              Tournament
            </th>

            <th className="px-5 py-4 text-sm text-gray-400">
              Game
            </th>

            <th className="px-5 py-4 text-sm text-gray-400">
              Joined
            </th>
          </tr>
        </thead>

<tbody>
  {players
    .filter((player) => {
      const search = playerSearch.toLowerCase().trim();

      if (!search) return true;

      const tournamentData = Array.isArray(player.tournaments)
        ? player.tournaments[0]
        : player.tournaments;

      return (
        player.username.toLowerCase().includes(search) ||
        player.game_id.toLowerCase().includes(search) ||
        tournamentData?.title?.toLowerCase().includes(search) ||
        tournamentData?.game?.toLowerCase().includes(search)
      );
    })
    .map((player) => {
            const tournamentData = Array.isArray(player.tournaments)
              ? player.tournaments[0]
              : player.tournaments;

            return (
              <tr
                key={player.id}
                className="border-b border-white/5 last:border-b-0"
              >
                <td className="px-5 py-4 font-bold">
                  {player.username}
                </td>

                <td className="px-5 py-4 text-gray-300">
                  {player.game_id}
                </td>

                <td className="px-5 py-4 text-gray-300">
                  {tournamentData?.title || "Unknown"}
                </td>

                <td className="px-5 py-4 text-gray-300">
                  {tournamentData?.game || "Unknown"}
                </td>

                <td className="px-5 py-4 text-gray-400">
                  {new Date(
                    player.joined_at
                  ).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</div>
      </section>
    </main>
  );
}