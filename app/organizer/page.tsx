"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Organizer = {
  id: string;
  organizer_name: string;
  organization_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

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
  room_id: string | null;
  room_password: string | null;
  is_private?: boolean;
access_number?: string | null;
access_password?: string | null;
};

type Player = {
  id: string;
  player_id: string;
  username: string;
  game_id: string;
  joined_at: string;
  tournament_id: string;
  tournaments:
    | {
        title: string;
        game: string;
      }
    | {
        title: string;
        game: string;
      }[]
    | null;
};

export default function OrganizerPage() {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCounts, setPlayerCounts] = useState<
    Record<string, number>
  >({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const [tournamentFilter, setTournamentFilter] =
    useState("all");
    const [isPrivate, setIsPrivate] = useState(false);
const [accessNumber, setAccessNumber] = useState("");
const [accessPassword, setAccessPassword] = useState("");

  const [tournamentSearch, setTournamentSearch] =
    useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [playerSearch, setPlayerSearch] = useState("");

  const [resultTournamentId, setResultTournamentId] =
    useState("");

  const [resultPlayerId, setResultPlayerId] =
    useState("");

  const [resultPosition, setResultPosition] =
    useState("1");

  const [resultPrize, setResultPrize] =
    useState("");

  const [savingResult, setSavingResult] =
    useState(false);

  const tournamentsPerPage = 5;
  function generateAccessNumber() {
  return String(
    Math.floor(
      100000 + Math.random() * 900000
    )
  );
}

function generateAccessPassword() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  let password = "";

  for (let i = 0; i < 8; i++) {
    password +=
      characters[
        Math.floor(
          Math.random() * characters.length
        )
      ];
  }

  return password;
}

  useEffect(() => {
    async function loadOrganizer() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      const user = authData.user;

      const { data: organizerData, error: organizerError } =
        await supabase
          .from("organizers")
          .select(
            "id, organizer_name, organization_name, email, phone, status"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (organizerError) {
        console.error(organizerError);
        setError(organizerError.message);
        setLoading(false);
        return;
      }

      if (!organizerData) {
        window.location.href = "/organizer/apply";
        return;
      }

      setOrganizer(organizerData);

      setLoading(false);

      await loadTournaments(organizerData.id);
      await loadPlayers(organizerData.id);
    }

    loadOrganizer();
  }, []);

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

  async function loadTournaments(organizerId?: string) {
    const currentOrganizerId =
      organizerId || organizer?.id;

    if (!currentOrganizerId) return;

    setLoadingTournaments(true);

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("organizer_id", currentOrganizerId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
      setError(error.message);
      setLoadingTournaments(false);
      return;
    }

    setTournaments(data || []);

    const counts: Record<string, number> = {};

    for (const tournament of data || []) {
      const { count } = await supabase
        .from("tournament_players")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("tournament_id", tournament.id);

      counts[tournament.id] = count || 0;
    }

    setPlayerCounts(counts);
    setLoadingTournaments(false);
  }

  async function loadPlayers(organizerId?: string) {
    const currentOrganizerId =
      organizerId || organizer?.id;

    if (!currentOrganizerId) return;

    setLoadingPlayers(true);

    const { data: organizerTournaments } =
      await supabase
        .from("tournaments")
        .select("id")
        .eq("organizer_id", currentOrganizerId);

    const tournamentIds =
      organizerTournaments?.map(
        (tournament) => tournament.id
      ) || [];

    if (tournamentIds.length === 0) {
      setPlayers([]);
      setLoadingPlayers(false);
      return;
    }

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
      .in("tournament_id", tournamentIds)
      .order("joined_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setError(error.message);
      setLoadingPlayers(false);
      return;
    }

    setPlayers((data || []) as Player[]);
    setLoadingPlayers(false);
  }

 function resetForm() {
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
  setIsPrivate(false);
  setAccessNumber("");
  setAccessPassword("");
  setEditingId(null);
}

  async function createTournament(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!organizer) {
      setError("Organizer profile not found.");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");
    const finalAccessNumber = isPrivate
  ? generateAccessNumber()
  : null;

const finalAccessPassword = isPrivate
  ? generateAccessPassword()
  : null;

    const { error: createError } = await supabase
      .from("tournaments")
      .insert({
        organizer_id: organizer.id,
        title: title.trim(),
        game,
        entry_fee: Number(entryFee),
        prize_pool: Number(prizePool),
        max_players: Number(maxPlayers),
        start_time: new Date(
          startTime
        ).toISOString(),
        end_time: new Date(
          endTime
        ).toISOString(),
        status: "upcoming",
        registration_status:
          registrationStatus,
        room_id: roomId.trim() || null,
        room_password:
          roomPassword.trim() || null,
          is_private: isPrivate,
access_number: finalAccessNumber,
access_password: finalAccessPassword,
      });

    if (createError) {
      console.error(createError);
      setError(createError.message);
      setCreating(false);
      return;
    }

    setMessage(
      "Tournament created successfully!"
    );

    resetForm();

    setShowCreateForm(false);

    await loadTournaments(organizer.id);
    await loadPlayers(organizer.id);

    setCreating(false);
  }

  function startEditing(
    tournament: Tournament
  ) {
    setEditingId(tournament.id);

    setTitle(tournament.title);
    setGame(tournament.game);
    setEntryFee(
      String(tournament.entry_fee)
    );
    setPrizePool(
      String(tournament.prize_pool)
    );
    setMaxPlayers(
      String(tournament.max_players)
    );

    const start = new Date(
      tournament.start_time
    );

    const end = new Date(
      tournament.end_time
    );

    setStartTime(
      new Date(
        start.getTime() -
          start.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16)
    );

    setEndTime(
      new Date(
        end.getTime() -
          end.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16)
    );

    setRoomId(
      tournament.room_id || ""
    );

    setRoomPassword(
      tournament.room_password || ""
    );
    setIsPrivate(
  tournament.is_private ?? false
);

setAccessNumber(
  tournament.access_number || ""
);

setAccessPassword(
  tournament.access_password || ""
);

    setRegistrationStatus(
      tournament.registration_status ||
        "open"
    );

    setShowCreateForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveTournament(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingId || !organizer) {
      return;
    }

    setSavingEdit(true);
    setError("");
    setMessage("");

    const { error: updateError } =
      await supabase
        .from("tournaments")
        .update({
          title: title.trim(),
          game,
          entry_fee: Number(entryFee),
          prize_pool: Number(prizePool),
          max_players: Number(maxPlayers),
          start_time: new Date(
            startTime
          ).toISOString(),
          end_time: new Date(
            endTime
          ).toISOString(),
          registration_status:
            registrationStatus,
          room_id:
            roomId.trim() || null,
          room_password:
            roomPassword.trim() || null,
        })
        .eq("id", editingId)
        .eq(
          "organizer_id",
          organizer.id
        );

    if (updateError) {
      console.error(updateError);
      setError(updateError.message);
      setSavingEdit(false);
      return;
    }

    setMessage(
      "Tournament updated successfully!"
    );

    resetForm();

    setShowCreateForm(false);

    await loadTournaments(organizer.id);
    await loadPlayers(organizer.id);

    setSavingEdit(false);
  }

  async function deleteTournament(
    tournamentId: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this tournament?"
      );

    if (!confirmed) return;

    if (!organizer) return;

    setError("");
    setMessage("");

    const { error: deleteError } =
      await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId)
        .eq(
          "organizer_id",
          organizer.id
        );

    if (deleteError) {
      console.error(deleteError);
      setError(deleteError.message);
      return;
    }

    setMessage(
      "Tournament deleted successfully."
    );

    await loadTournaments(organizer.id);
    await loadPlayers(organizer.id);
  }

  const filteredTournaments =
    tournaments.filter((tournament) => {
      if (
        tournamentFilter !== "all"
      ) {
        const status =
          getTournamentStatus(
            tournament.start_time,
            tournament.end_time
          );

        if (
          status !==
          tournamentFilter
        ) {
          return false;
        }
      }

      const search =
        tournamentSearch
          .toLowerCase()
          .trim();

      if (!search) return true;

      return (
        tournament.title
          .toLowerCase()
          .includes(search) ||
        tournament.game
          .toLowerCase()
          .includes(search)
      );
    });

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredTournaments.length /
        tournamentsPerPage
    )
  );

  const paginatedTournaments =
    filteredTournaments.slice(
      (currentPage - 1) *
        tournamentsPerPage,
      currentPage *
        tournamentsPerPage
    );

  const totalPlayers = Object.values(
    playerCounts
  ).reduce(
    (total, count) =>
      total + count,
    0
  );

  const liveTournaments =
    tournaments.filter(
      (tournament) =>
        getTournamentStatus(
          tournament.start_time,
          tournament.end_time
        ) === "LIVE"
    ).length;

  const upcomingTournaments =
    tournaments.filter(
      (tournament) =>
        getTournamentStatus(
          tournament.start_time,
          tournament.end_time
        ) === "UPCOMING"
    ).length;

  async function addResult(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !resultTournamentId ||
      !resultPlayerId ||
      !resultPosition
    ) {
      setError(
        "Please select tournament, player and position."
      );
      return;
    }

    setSavingResult(true);
    setError("");
    setMessage("");

    const selectedPlayer =
      players.find(
        (player) =>
          player.player_id ===
          resultPlayerId
      );

    if (!selectedPlayer) {
      setError("Player not found.");
      setSavingResult(false);
      return;
    }

    const { error } =
      await supabase
        .from("tournament_results")
        .insert({
          tournament_id:
            resultTournamentId,
          player_id:
            selectedPlayer.player_id,
          username:
            selectedPlayer.username,
          position:
            Number(resultPosition),
          prize:
            Number(resultPrize || 0),
        });

    if (error) {
      console.error(error);
      setError(error.message);
      setSavingResult(false);
      return;
    }

    setMessage(
      "Tournament result added successfully!"
    );

    setResultPlayerId("");
    setResultPosition("1");
    setResultPrize("");

    setSavingResult(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-gray-400">
          Loading organizer dashboard...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <a
            href="/"
            className="text-2xl font-black tracking-tight text-green-400 no-underline"
          >
            GAMEARENA
          </a>

          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-sm font-semibold text-gray-400 no-underline hover:text-white"
            >
              Player Dashboard
            </a>

            <button
              onClick={logout}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:border-red-400 hover:text-red-400"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-sm font-bold uppercase tracking-widest text-green-400">
          Organizer Dashboard
        </p>

        <h1 className="mt-3 text-4xl font-black">
          Welcome,{" "}
          {organizer?.organizer_name} 👋
        </h1>

        <p className="mt-3 text-gray-400">
          Create and manage your gaming tournaments.
        </p>

        {(error || message) && (
          <div
            className={`mt-6 rounded-xl border p-4 text-sm ${
              error
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-green-500/30 bg-green-500/10 text-green-400"
            }`}
          >
            {error || message}
          </div>
        )}

        {/* Statistics */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-gray-400">
              My Tournaments
            </p>

            <p className="mt-2 text-3xl font-black">
              {tournaments.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-gray-400">
              Registered Players
            </p>

            <p className="mt-2 text-3xl font-black">
              {totalPlayers}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-gray-400">
              Live Tournaments
            </p>

            <p className="mt-2 text-3xl font-black text-green-400">
              {liveTournaments}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-gray-400">
              Upcoming
            </p>

            <p className="mt-2 text-3xl font-black text-yellow-400">
              {upcomingTournaments}
            </p>
          </div>
        </div>

        {/* Create / Edit Tournament */}

        <section className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                {editingId
                  ? "Edit Tournament"
                  : "Create Tournament"}
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Create and manage your tournament details.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (showCreateForm) {
                  resetForm();
                }

                setShowCreateForm(
                  !showCreateForm
                );
              }}
              className="rounded-xl bg-green-400 px-5 py-3 text-sm font-black text-black hover:bg-green-300"
            >
              {showCreateForm
                ? "✕ Close Form"
                : "+ Create Tournament"}
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={
                editingId
                  ? saveTournament
                  : createTournament
              }
              className="mt-6 space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Tournament Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="GameArena Battle"
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Game
                </label>

                <select
                  value={game}
                  onChange={(e) =>
                    setGame(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                >
                  <option value="BGMI">
                    BGMI
                  </option>

                  <option value="Free Fire">
                    Free Fire
                  </option>

                  <option value="Call of Duty Mobile">
                    Call of Duty Mobile
                  </option>

                  <option value="Valorant">
                    Valorant
                  </option>
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
                    onChange={(e) =>
                      setEntryFee(
                        e.target.value
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
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
                    onChange={(e) =>
                      setPrizePool(
                        e.target.value
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
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
                  onChange={(e) =>
                    setMaxPlayers(
                      e.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
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
                    onChange={(e) =>
                      setStartTime(
                        e.target.value
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-300">
                    Tournament End
                  </label>

                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) =>
                      setEndTime(
                        e.target.value
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
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
                      onChange={(e) =>
                        setRoomId(
                          e.target.value
                        )
                      }
                      placeholder="12345678"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-300">
                      Room Password
                    </label>

                    <input
                      type="text"
                      value={roomPassword}
                      onChange={(e) =>
                        setRoomPassword(
                          e.target.value
                        )
                      }
                      placeholder="GAME123"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">
                  Registration Status
                </label>

                <select
                  value={registrationStatus}
                  onChange={(e) =>
                    setRegistrationStatus(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                >
                  <option value="open">
                    Open
                  </option>

                  <option value="closed">
                    Closed
                  </option>
                </select>
              </div>
              <div>
  <label className="mb-2 block text-sm font-bold text-gray-300">
    Tournament Access
  </label>

  <select
    value={isPrivate ? "private" : "public"}
    onChange={(e) => {
      const privateTournament =
        e.target.value === "private";

      setIsPrivate(privateTournament);

      if (!privateTournament) {
        setAccessNumber("");
        setAccessPassword("");
      }
    }}
    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
  >
<option
  value="public"
  className="bg-gray-900 text-white"
>
  Public Tournament
</option>

<option
  value="private"
  className="bg-gray-900 text-white"
>
  Private Tournament
</option>
  </select>

  {isPrivate && (
    <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
      <p className="mb-2 text-sm font-bold text-yellow-300">
        Private Tournament
      </p>

      <p className="text-sm text-gray-300">
        A tournament number and password will be
        generated automatically when you create
        the tournament.
      </p>
    </div>
  )}
</div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={
                    creating ||
                    savingEdit
                  }
                  className="flex-1 rounded-xl bg-green-400 px-6 py-4 font-black text-black hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editingId
                    ? savingEdit
                      ? "Saving Changes..."
                      : "Save Changes"
                    : creating
                    ? "Creating Tournament..."
                    : "Create Tournament"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowCreateForm(
                        false
                      );
                    }}
                    className="rounded-xl border border-white/10 px-6 py-4 font-black hover:border-white/30"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Tournament Management */}

        <section className="mt-16">
          <h2 className="text-2xl font-black">
            My Tournaments
          </h2>

          <div className="mt-5">
            <input
              type="text"
              value={tournamentSearch}
              onChange={(e) => {
                setTournamentSearch(
                  e.target.value
                );
                setCurrentPage(1);
              }}
              placeholder="Search tournaments..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-gray-500 focus:border-green-400"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {[
              {
                value: "all",
                label: "All",
              },
              {
                value: "UPCOMING",
                label: "Upcoming",
              },
              {
                value: "LIVE",
                label: "Live",
              },
              {
                value: "COMPLETED",
                label: "Completed",
              },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setTournamentFilter(
                    filter.value
                  );
                  setCurrentPage(1);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${
                  tournamentFilter ===
                  filter.value
                    ? "bg-green-400 text-black"
                    : "border border-white/10 bg-white/5 text-gray-300"
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
          ) : tournaments.length ===
            0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <div className="text-4xl">
                🎮
              </div>

              <h3 className="mt-3 text-xl font-black">
                No tournaments yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Create your first tournament above.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {paginatedTournaments.map(
                (tournament) => {
                  const status =
                    getTournamentStatus(
                      tournament.start_time,
                      tournament.end_time
                    );

                  const registered =
                    playerCounts[
                      tournament.id
                    ] || 0;

                  const spotsRemaining =
                    Math.max(
                      tournament.max_players -
                        registered,
                      0
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
                              {
                                tournament.title
                              }
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                status ===
                                "LIVE"
                                  ? "bg-green-400/10 text-green-400"
                                  : status ===
                                    "UPCOMING"
                                  ? "bg-yellow-400/10 text-yellow-400"
                                  : "bg-gray-400/10 text-gray-400"
                              }`}
                            >
                              {status}
                            </span>
                            {tournament.is_private && (
  <span className="rounded-full bg-purple-400/10 px-3 py-1 text-xs font-black text-purple-400">
    PRIVATE
  </span>
)}
                          </div>

                          <p className="mt-2 text-sm text-gray-400">
                            {tournament.game}
                          </p>
                          {tournament.is_private && (
  <div className="mt-4 rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-purple-400">
      Private Tournament Access
    </p>

    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div>
        <p className="text-xs text-gray-500">
          Tournament Number
        </p>

        <p className="mt-1 font-bold text-white">
          {tournament.access_number || "Not available"}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          Tournament Password
        </p>

        <p className="mt-1 font-bold text-white">
          {tournament.access_password || "Not available"}
        </p>
      </div>
    </div>
  </div>
)}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              startEditing(
                                tournament
                              )
                            }
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
                            type="button"
                            onClick={() =>
                              deleteTournament(
                                tournament.id
                              )
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
                            ₹
                            {
                              tournament.entry_fee
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Prize Pool
                          </p>

                          <p className="mt-1 font-bold">
                            ₹
                            {
                              tournament.prize_pool
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Registered
                          </p>

                          <p className="mt-1 font-bold">
                            {registered} /{" "}
                            {
                              tournament.max_players
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Spots Remaining
                          </p>

                          <p className="mt-1 font-bold">
                            {
                              spotsRemaining
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Registration
                          </p>

                          <p
                            className={`mt-1 font-bold ${
                              tournament.registration_status ===
                                "closed" ||
                              registered >=
                                tournament.max_players
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                          >
                            {tournament.registration_status ===
                            "closed"
                              ? "CLOSED"
                              : registered >=
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

                        <div>
                          <p className="text-xs text-gray-500">
                            End
                          </p>

                          <p className="mt-1 font-bold">
                            {new Date(
                              tournament.end_time
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}

              {paginatedTournaments.length ===
                0 && (
                <p className="text-gray-400">
                  No tournaments match your search.
                </p>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      )
                    }
                    disabled={
                      currentPage === 1
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="px-3 text-sm font-bold text-gray-400">
                    Page{" "}
                    {currentPage} of{" "}
                    {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      )
                    }
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Tournament Results */}

        <section className="mt-16">
          <h2 className="text-2xl font-black">
            Tournament Results
          </h2>

          <p className="mt-2 text-gray-400">
            Add winners and prizes for your tournaments.
          </p>

          <form
            onSubmit={addResult}
            className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Tournament
                </label>

                <select
                  value={
                    resultTournamentId
                  }
                  onChange={(e) => {
                    setResultTournamentId(
                      e.target.value
                    );
                    setResultPlayerId("");
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                >
                  <option value="">
                    Select Tournament
                  </option>

                  {tournaments.map(
                    (tournament) => (
                      <option
                        key={
                          tournament.id
                        }
                        value={
                          tournament.id
                        }
                      >
                        {
                          tournament.title
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Player
                </label>

                <select
                  value={
                    resultPlayerId
                  }
                  onChange={(e) =>
                    setResultPlayerId(
                      e.target.value
                    )
                  }
                  disabled={
                    !resultTournamentId
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400 disabled:opacity-50"
                >
                  <option value="">
                    Select Player
                  </option>

                  {players
                    .filter(
                      (player) =>
                        player.tournament_id ===
                        resultTournamentId
                    )
                    .map(
                      (player) => (
                        <option
                          key={
                            player.id
                          }
                          value={
                            player.player_id
                          }
                        >
                          {
                            player.username
                          }{" "}
                          —{" "}
                          {
                            player.game_id
                          }
                        </option>
                      )
                    )}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Position
                </label>

                <select
                  value={
                    resultPosition
                  }
                  onChange={(e) =>
                    setResultPosition(
                      e.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                >
                  <option value="1">
                    1st Place
                  </option>

                  <option value="2">
                    2nd Place
                  </option>

                  <option value="3">
                    3rd Place
                  </option>

                  <option value="4">
                    4th Place
                  </option>

                  <option value="5">
                    5th Place
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300">
                  Prize
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    resultPrize
                  }
                  onChange={(e) =>
                    setResultPrize(
                      e.target.value
                    )
                  }
                  placeholder="Prize amount"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-green-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                savingResult
              }
              className="mt-6 w-full rounded-xl bg-green-400 py-3 font-black text-black hover:bg-green-300 disabled:opacity-50"
            >
              {savingResult
                ? "Saving Result..."
                : "Add Result"}
            </button>
          </form>
        </section>

        {/* Registered Players */}

        <section className="mt-16">
          <h2 className="text-2xl font-black">
            Registered Players
          </h2>

          <p className="mt-2 text-gray-400">
            Players who have joined your tournaments.
          </p>

          <div className="mt-5">
            <input
              type="text"
              value={playerSearch}
              onChange={(e) =>
                setPlayerSearch(
                  e.target.value
                )
              }
              placeholder="Search players..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-gray-500 focus:border-green-400"
            />
          </div>

          {loadingPlayers ? (
            <p className="mt-6 text-gray-400">
              Loading players...
            </p>
          ) : players.length ===
            0 ? (
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
                      const search =
                        playerSearch
                          .toLowerCase()
                          .trim();

                      if (!search)
                        return true;

                      const tournamentData =
                        Array.isArray(
                          player.tournaments
                        )
                          ? player
                              .tournaments[0]
                          : player.tournaments;

                      return (
                        player.username
                          .toLowerCase()
                          .includes(
                            search
                          ) ||
                        player.game_id
                          .toLowerCase()
                          .includes(
                            search
                          ) ||
                        tournamentData?.title
                          ?.toLowerCase()
                          .includes(
                            search
                          ) ||
                        tournamentData?.game
                          ?.toLowerCase()
                          .includes(
                            search
                          )
                      );
                    })
                    .map((player) => {
                      const tournamentData =
                        Array.isArray(
                          player.tournaments
                        )
                          ? player
                              .tournaments[0]
                          : player.tournaments;

                      return (
                        <tr
                          key={
                            player.id
                          }
                          className="border-b border-white/5 last:border-b-0"
                        >
                          <td className="px-5 py-4 font-bold">
                            {
                              player.username
                            }
                          </td>

                          <td className="px-5 py-4 text-gray-300">
                            {
                              player.game_id
                            }
                          </td>

                          <td className="px-5 py-4 text-gray-300">
                            {
                              tournamentData
                                ?.title ||
                              "Unknown"
                            }
                          </td>

                          <td className="px-5 py-4 text-gray-300">
                            {
                              tournamentData
                                ?.game ||
                              "Unknown"
                            }
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
        </section>

        {/* Organizer Information */}

        <section className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-black">
            Organizer Information
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Organizer
              </p>

              <p className="mt-1 font-bold">
                {
                  organizer?.organizer_name
                }
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Organization
              </p>

              <p className="mt-1 font-bold">
                {organizer?.organization_name ||
                  "Independent Organizer"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Email
              </p>

              <p className="mt-1 font-bold">
                {organizer?.email ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Phone
              </p>

              <p className="mt-1 font-bold">
                {organizer?.phone ||
                  "Not provided"}
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}