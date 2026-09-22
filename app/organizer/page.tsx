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
  institution_name: string | null;
  is_verified: boolean;
  logo_url: string | null;
};

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
  room_id: string | null;
  room_password: string | null;
  is_private?: boolean;
  access_number?: string | null;
  access_password?: string | null;
  scope?: "intra" | "inter" | null;
  institution_name?: string | null;
  is_college_only?: boolean;
  access_code?: string | null;
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
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [title, setTitle] = useState("");
  const [game, setGame] = useState("BGMI");
  const [format, setFormat] = useState<"solo" | "squad">("solo");
  const [entryFee, setEntryFee] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("100");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");

  const [registrationStatus, setRegistrationStatus] = useState("open");

  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessNumber, setAccessNumber] = useState("");
  const [accessPassword, setAccessPassword] = useState("");

  const [tournamentSearch, setTournamentSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [playerSearch, setPlayerSearch] = useState("");

  const [resultTournamentId, setResultTournamentId] = useState("");
  const [resultPlayerId, setResultPlayerId] = useState("");
  const [resultPosition, setResultPosition] = useState("1");
  const [resultPrize, setResultPrize] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  // College & Template state
  const [scope, setScope] = useState<"intra" | "inter" | "">("");
  const [accessCode, setAccessCode] = useState("");
  const [isCollegeOnly, setIsCollegeOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const TEMPLATES = [
    {
      id: "bgmi-squad",
      name: "College BGMI Squad Championship",
      game: "BGMI",
      format: "squad" as const,
      maxPlayers: "100",
      entryFee: "50",
      prizePool: "5000",
      scope: "intra" as const,
      isCollegeOnly: true,
    },
    {
      id: "valo-inter",
      name: "Inter-College Valorant Showdown",
      game: "Valorant",
      format: "squad" as const,
      maxPlayers: "40",
      entryFee: "100",
      prizePool: "8000",
      scope: "inter" as const,
      isCollegeOnly: true,
    },
    {
      id: "ff-solo",
      name: "Campus Solo Free Fire Cup",
      game: "Free Fire",
      format: "solo" as const,
      maxPlayers: "50",
      entryFee: "30",
      prizePool: "2500",
      scope: "intra" as const,
      isCollegeOnly: true,
    },
    {
      id: "quick-elim",
      name: "College Solo Knockout",
      game: "BGMI",
      format: "solo" as const,
      maxPlayers: "50",
      entryFee: "25",
      prizePool: "1500",
      scope: "intra" as const,
      isCollegeOnly: true,
    },
  ];

  const tournamentsPerPage = 5;

  function generateAccessNumber() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function generateAccessPassword() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += characters[Math.floor(Math.random() * characters.length)];
    }
    return password;
  }

  useEffect(() => {
    async function loadOrganizer() {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      const user = authData.user;

      let { data: organizerData, error: organizerError } = await supabase
        .from("organizers")
        .select("id, organizer_name, organization_name, email, phone, status, institution_name, is_verified, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (organizerError && organizerError.message?.includes("does not exist")) {
        const fallback = await supabase
          .from("organizers")
          .select("id, organizer_name, organization_name, email, phone, status")
          .eq("user_id", user.id)
          .maybeSingle();
        organizerData = fallback.data ? {
          ...fallback.data,
          institution_name: null,
          is_verified: false,
          logo_url: null,
        } : null;
        organizerError = fallback.error;
      }

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

  function getTournamentStatus(startTime: string, endTime: string) {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (now < start) return "UPCOMING";
    if (now < end) return "LIVE";
    return "COMPLETED";
  }

  async function loadTournaments(organizerId?: string) {
    const currentOrganizerId = organizerId || organizer?.id;
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
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournament.id);
      counts[tournament.id] = count || 0;
    }

    setPlayerCounts(counts);
    setLoadingTournaments(false);
  }

  async function loadPlayers(organizerId?: string) {
    const currentOrganizerId = organizerId || organizer?.id;
    if (!currentOrganizerId) return;

    setLoadingPlayers(true);

    const { data: organizerTournaments } = await supabase
      .from("tournaments")
      .select("id")
      .eq("organizer_id", currentOrganizerId);

    const tournamentIds = organizerTournaments?.map((t) => t.id) || [];

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
        tournaments ( title, game )
      `)
      .in("tournament_id", tournamentIds)
      .order("joined_at", { ascending: false });

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
    setFormat("solo");
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
    setScope("");
    setAccessCode("");
    setIsCollegeOnly(false);
    setSelectedTemplate("");
    setEditingId(null);
  }

  async function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organizer) {
      setError("Organizer profile not found.");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");

    const finalAccessNumber = isPrivate ? generateAccessNumber() : null;
    const finalAccessPassword = isPrivate ? generateAccessPassword() : null;

    const payload: any = {
      organizer_id: organizer.id,
      title: title.trim(),
      game,
      format,
      entry_fee: Number(entryFee),
      prize_pool: Number(prizePool),
      max_players: Number(maxPlayers),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      status: "upcoming",
      registration_status: registrationStatus,
      room_id: roomId.trim() || null,
      room_password: roomPassword.trim() || null,
      is_private: isPrivate,
      access_number: finalAccessNumber,
      access_password: finalAccessPassword,
      scope: scope || null,
      access_code: accessCode.trim() || null,
      is_college_only: isCollegeOnly,
      institution_name: organizer.institution_name || null,
    };

    let { error: createError } = await supabase.from("tournaments").insert(payload);

    if (createError && createError.message?.includes("does not exist")) {
      delete payload.scope;
      delete payload.access_code;
      delete payload.is_college_only;
      delete payload.institution_name;
      const res = await supabase.from("tournaments").insert(payload);
      createError = res.error;
    }

    if (createError) {
      console.error(createError);
      setError(createError.message);
      setCreating(false);
      return;
    }

    setMessage("Tournament created successfully!");
    resetForm();
    setShowCreateForm(false);

    await loadTournaments(organizer.id);
    await loadPlayers(organizer.id);

    setCreating(false);
  }

  function startEditing(tournament: Tournament) {
    setEditingId(tournament.id);
    setTitle(tournament.title);
    setGame(tournament.game);
    setFormat(tournament.format || "solo");
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
    setIsPrivate(tournament.is_private ?? false);
    setAccessNumber(tournament.access_number || "");
    setAccessPassword(tournament.access_password || "");
    setRegistrationStatus(tournament.registration_status || "open");
    setScope((tournament.scope as any) || "");
    setAccessCode(tournament.access_code || "");
    setIsCollegeOnly(tournament.is_college_only ?? false);

    setShowCreateForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId || !organizer) return;

    setSavingEdit(true);
    setError("");
    setMessage("");

    const updatePayload: any = {
      title: title.trim(),
      game,
      format,
      entry_fee: Number(entryFee),
      prize_pool: Number(prizePool),
      max_players: Number(maxPlayers),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      registration_status: registrationStatus,
      room_id: roomId.trim() || null,
      room_password: roomPassword.trim() || null,
      scope: scope || null,
      access_code: accessCode.trim() || null,
      is_college_only: isCollegeOnly,
    };

    let { error: updateError } = await supabase
      .from("tournaments")
      .update(updatePayload)
      .eq("id", editingId)
      .eq("organizer_id", organizer.id);

    if (updateError && updateError.message?.includes("does not exist")) {
      delete updatePayload.scope;
      delete updatePayload.access_code;
      delete updatePayload.is_college_only;
      const res = await supabase
        .from("tournaments")
        .update(updatePayload)
        .eq("id", editingId)
        .eq("organizer_id", organizer.id);
      updateError = res.error;
    }

    if (updateError) {
      console.error(updateError);
      setError(updateError.message);
      setSavingEdit(false);
      return;
    }

    setMessage("Tournament updated successfully!");
    resetForm();
    setShowCreateForm(false);

    await loadTournaments(organizer.id);
    await loadPlayers(organizer.id);

    setSavingEdit(false);
  }

  async function deleteTournament(tournamentId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this tournament? This action cannot be undone."
    );

    if (!confirmed) return;

    if (!organizer) {
      setError("Organizer information could not be found.");
      return;
    }

    setError("");
    setMessage("");

    const { data: deletedTournament, error: deleteError } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", tournamentId)
      .eq("organizer_id", organizer.id)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      console.error("Tournament delete error:", deleteError);
      setError(`Unable to delete tournament: ${deleteError.message}`);
      return;
    }

    if (!deletedTournament) {
      setError("Tournament was not deleted. You may not have permission.");
      return;
    }

    setTournaments((current) => current.filter((t) => t.id !== tournamentId));
    setMessage("Tournament deleted successfully.");
  }

  const filteredTournaments = tournaments.filter((tournament) => {
    if (tournamentFilter !== "all") {
      const status = getTournamentStatus(tournament.start_time, tournament.end_time);
      if (status !== tournamentFilter) return false;
    }

    const search = tournamentSearch.toLowerCase().trim();
    if (!search) return true;

    return (
      tournament.title.toLowerCase().includes(search) ||
      tournament.game.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredTournaments.length / tournamentsPerPage));

  const paginatedTournaments = filteredTournaments.slice(
    (currentPage - 1) * tournamentsPerPage,
    currentPage * tournamentsPerPage
  );

  const totalPlayers = Object.values(playerCounts).reduce((total, count) => total + count, 0);

  const liveTournaments = tournaments.filter(
    (t) => getTournamentStatus(t.start_time, t.end_time) === "LIVE"
  ).length;

  const upcomingTournaments = tournaments.filter(
    (t) => getTournamentStatus(t.start_time, t.end_time) === "UPCOMING"
  ).length;

  async function addResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resultTournamentId || !resultPlayerId || !resultPosition) {
      setError("Please select tournament, player and position.");
      return;
    }

    setSavingResult(true);
    setError("");
    setMessage("");

    const selectedPlayer = players.find((p) => p.player_id === resultPlayerId);

    if (!selectedPlayer) {
      setError("Player not found.");
      setSavingResult(false);
      return;
    }

    const { error } = await supabase.from("tournament_results").insert({
      tournament_id: resultTournamentId,
      player_id: selectedPlayer.player_id,
      username: selectedPlayer.username,
      position: Number(resultPosition),
      prize: Number(resultPrize || 0),
    });

    if (error) {
      console.error(error);
      setError(error.message);
      setSavingResult(false);
      return;
    }

    setMessage("Tournament result added successfully!");
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
      <main className="min-h-screen bg-white px-4 py-6 text-black">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-black">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 pb-4">
          <a href="/" className="text-xl font-bold text-black no-underline">
            GAME<span className="text-green-600">ARENA</span>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 no-underline transition hover:border-green-600 hover:text-green-600"
            >
              Player Dashboard
            </a>

            <button
              onClick={logout}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Welcome */}
        <section className="py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-600">Organizer Dashboard</span>
                {organizer?.is_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                    ✓ Verified Organizer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                    ⏳ Verification Pending
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-3xl font-bold">Welcome, {organizer?.organizer_name}</h1>
              <p className="mt-1 text-gray-600">
                {organizer?.institution_name ? `🏛️ ${organizer.institution_name} • ` : ""}
                Create and manage your gaming tournaments.
              </p>
            </div>
            {organizer?.logo_url && (
              <img
                src={organizer.logo_url}
                alt="Logo"
                className="h-14 w-14 rounded-full border border-gray-200 object-cover"
              />
            )}
          </div>
        </section>

        {/* Messages */}
        {(error || message) && (
          <div
            className={`mb-6 rounded-lg border p-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {error || message}
          </div>
        )}

        {/* Statistics */}
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">My Tournaments</p>
            <p className="mt-1 text-2xl font-bold">{tournaments.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Registered Players</p>
            <p className="mt-1 text-2xl font-bold">{totalPlayers}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Live Tournaments</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{liveTournaments}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Upcoming</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{upcomingTournaments}</p>
          </div>
        </section>

        {/* Create / Edit Tournament */}
        <section className="mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Tournament" : "Create Tournament"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {editingId ? "Update tournament details below." : "Create a new tournament for players to join."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (showCreateForm) {
                  resetForm();
                }
                setShowCreateForm(!showCreateForm);
              }}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-500"
            >
              {showCreateForm ? "✕ Close" : "+ Create Tournament"}
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={editingId ? saveTournament : createTournament}
              className="mt-6 space-y-6 rounded-lg border border-gray-200 bg-white p-6"
            >
              {/* Template Selector */}
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                <label className="mb-1 block text-sm font-semibold text-purple-900">
                  ⚡ Quick College Tournament Template (Optional)
                </label>
                <p className="mb-3 text-xs text-purple-700">
                  Select a college format preset to automatically populate tournament configuration.
                </p>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    const tId = e.target.value;
                    setSelectedTemplate(tId);
                    const tmpl = TEMPLATES.find((t) => t.id === tId);
                    if (tmpl) {
                      setTitle(tmpl.name);
                      setGame(tmpl.game);
                      setFormat(tmpl.format);
                      setMaxPlayers(tmpl.maxPlayers);
                      setEntryFee(tmpl.entryFee);
                      setPrizePool(tmpl.prizePool);
                      setScope(tmpl.scope);
                      setIsCollegeOnly(tmpl.isCollegeOnly);
                    }
                  }}
                  className="w-full rounded-lg border border-purple-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-600"
                >
                  <option value="">-- Select a Preset or Build Custom --</option>
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.game} • {t.format.toUpperCase()} • {t.maxPlayers} players)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tournament Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="GameArena Battle"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Game *
                  </label>
                  <select
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  >
                    <option value="BGMI">BGMI</option>
                    <option value="Free Fire">Free Fire</option>
                    <option value="Call of Duty Mobile">Call of Duty Mobile</option>
                    <option value="Valorant">Valorant</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tournament Format *
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as "solo" | "squad")}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  >
                    <option value="solo">Solo / Individual</option>
                    <option value="squad">Squad / Team</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Maximum Players *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Entry Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    placeholder="50"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Prize Pool (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    placeholder="5000"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tournament Start *
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tournament End *
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  />
                </div>
              </div>

              {/* College & Institution Settings */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold">College & Institution Scope</h3>
                <p className="mt-1 text-xs text-gray-600">
                  Target students from your campus or invite other colleges to participate.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Participation Scope
                    </label>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as "intra" | "inter" | "")}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                    >
                      <option value="">General (Open to everyone)</option>
                      <option value="intra">Intra-College (Only students from this institution)</option>
                      <option value="inter">Inter-College (Open to competing colleges)</option>
                    </select>
                  </div>

                  {scope === "intra" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Campus Access Code *
                      </label>
                      <input
                        type="text"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="e.g. DU-ESPORTS-2026"
                        required={scope === "intra"}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Students must enter this access code to join.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="collegeOnly"
                    checked={isCollegeOnly}
                    onChange={(e) => setIsCollegeOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label htmlFor="collegeOnly" className="text-sm font-medium text-gray-700">
                    Mark as College Exclusive Tournament
                  </label>
                </div>
              </div>

              {/* Tournament Access */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold">Tournament Access</h3>

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tournament Type
                  </label>
                  <select
                    value={isPrivate ? "private" : "public"}
                    onChange={(e) => {
                      const privateTournament = e.target.value === "private";
                      setIsPrivate(privateTournament);
                      if (!privateTournament) {
                        setAccessNumber("");
                        setAccessPassword("");
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                  >
                    <option value="public">Public Tournament</option>
                    <option value="private">Private Tournament</option>
                  </select>
                </div>

                {isPrivate && (
                  <>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Tournament Number
                        </label>
                        <input
                          type="text"
                          value={accessNumber}
                          readOnly
                          placeholder="Auto-generated"
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 font-medium text-green-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Tournament Password
                        </label>
                        <input
                          type="text"
                          value={accessPassword}
                          readOnly
                          placeholder="Auto-generated"
                          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 font-medium text-green-600 outline-none"
                        />
                      </div>
                    </div>

                    <p className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                      A tournament number and password will be generated automatically when you create the tournament.
                    </p>
                  </>
                )}
              </div>

              {/* Game Room */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold">Game Room</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Room ID
                    </label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="12345678"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Room Password
                    </label>
                    <input
                      type="text"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="GAME123"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Registration Status
                    </label>
                    <select
                      value={registrationStatus}
                      onChange={(e) => setRegistrationStatus(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={creating || savingEdit}
                  className="flex-1 rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                      setShowCreateForm(false);
                    }}
                    className="rounded-lg border border-gray-300 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Tournament Management */}
        <section className="mt-10">
          <h2 className="text-xl font-bold">My Tournaments</h2>

          <div className="mt-4">
            <input
              type="text"
              value={tournamentSearch}
              onChange={(e) => {
                setTournamentSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search tournaments..."
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { value: "all", label: "All" },
              { value: "UPCOMING", label: "Upcoming" },
              { value: "LIVE", label: "Live" },
              { value: "COMPLETED", label: "Completed" },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setTournamentFilter(filter.value);
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tournamentFilter === filter.value
                    ? "bg-green-600 text-white"
                    : "border border-gray-300 text-gray-700 hover:border-green-600 hover:text-green-600"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loadingTournaments ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <div className="text-4xl">🎮</div>
              <h3 className="mt-3 font-bold">No tournaments yet</h3>
              <p className="mt-2 text-sm text-gray-600">Create your first tournament above.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {paginatedTournaments.map((tournament) => {
                const status = getTournamentStatus(tournament.start_time, tournament.end_time);
                const registered = playerCounts[tournament.id] || 0;
                const spotsRemaining = Math.max(tournament.max_players - registered, 0);

                return (
                  <div
                    key={tournament.id}
                    className="rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{tournament.title}</h3>

                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              status === "LIVE"
                                ? "bg-red-100 text-red-600"
                                : status === "UPCOMING"
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {status}
                          </span>

                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                            {tournament.format === "squad" ? "SQUAD" : "SOLO"}
                          </span>

                          {tournament.is_private && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-600">
                              PRIVATE
                            </span>
                          )}

                          {tournament.scope && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                              {tournament.scope === "intra" ? "INTRA-COLLEGE" : "INTER-COLLEGE"}
                            </span>
                          )}

                          {tournament.is_college_only && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              COLLEGE ONLY
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-gray-600">{tournament.game}</p>

                        {tournament.is_private && (
                          <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                            <p className="text-xs font-medium text-purple-600">Private Access</p>
                            <div className="mt-2 flex gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Number: </span>
                                <span className="font-medium">{tournament.access_number || "N/A"}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Password: </span>
                                <span className="font-medium">{tournament.access_password || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {tournament.format === "squad" && (
                          <a
                            href={`/organizer/squads?tournament=${tournament.id}`}
                            className="rounded-lg border border-green-300 px-3 py-1.5 text-sm font-medium text-green-600 no-underline transition hover:bg-green-50"
                          >
                            Squads
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => startEditing(tournament)}
                          className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                        >
                          Edit
                        </button>

                        <a
                          href={`/organizer/tournaments/${tournament.id}`}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 no-underline transition hover:bg-gray-50"
                        >
                          View
                        </a>

                        <button
                          type="button"
                          onClick={() => deleteTournament(tournament.id)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 md:grid-cols-5">
                      <div>
                        <p className="text-xs text-gray-500">Format</p>
                        <p className="font-medium text-blue-600">
                          {tournament.format === "squad" ? "Squad" : "Solo"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Entry Fee</p>
                        <p className="font-medium">₹{tournament.entry_fee}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Prize Pool</p>
                        <p className="font-medium text-green-600">₹{tournament.prize_pool}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Registered</p>
                        <p className="font-medium">{registered} / {tournament.max_players}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Registration</p>
                        <p
                          className={`font-medium ${
                            tournament.registration_status === "closed" || registered >= tournament.max_players
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {tournament.registration_status === "closed"
                            ? "CLOSED"
                            : registered >= tournament.max_players
                            ? "FULL"
                            : "OPEN"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Tournament Results */}
        <section className="mt-10">
          <h2 className="text-xl font-bold">Tournament Results</h2>
          <p className="mt-1 text-sm text-gray-600">Add winners and prizes for your tournaments.</p>

          <form onSubmit={addResult} className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tournament
                </label>
                <select
                  value={resultTournamentId}
                  onChange={(e) => {
                    setResultTournamentId(e.target.value);
                    setResultPlayerId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                >
                  <option value="">Select Tournament</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Player
                </label>
                <select
                  value={resultPlayerId}
                  onChange={(e) => setResultPlayerId(e.target.value)}
                  disabled={!resultTournamentId}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600 disabled:opacity-50"
                >
                  <option value="">Select Player</option>
                  {players
                    .filter((p) => p.tournament_id === resultTournamentId)
                    .map((p) => (
                      <option key={p.id} value={p.player_id}>
                        {p.username} — {p.game_id}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Position
                </label>
                <select
                  value={resultPosition}
                  onChange={(e) => setResultPosition(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                >
                  <option value="1">1st Place</option>
                  <option value="2">2nd Place</option>
                  <option value="3">3rd Place</option>
                  <option value="4">4th Place</option>
                  <option value="5">5th Place</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Prize (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={resultPrize}
                  onChange={(e) => setResultPrize(e.target.value)}
                  placeholder="Prize amount"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingResult}
              className="mt-4 w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingResult ? "Saving Result..." : "Add Result"}
            </button>
          </form>
        </section>

        {/* Registered Players */}
        <section className="mt-10">
          <h2 className="text-xl font-bold">Registered Players</h2>
          <p className="mt-1 text-sm text-gray-600">Players who have joined your tournaments.</p>

          <div className="mt-4">
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
            />
          </div>

          {loadingPlayers ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : players.length === 0 ? (
            <p className="mt-4 text-gray-600">No registered players yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[700px] text-left">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Player</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Game ID</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Tournament</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Game</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600">Joined</th>
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
                        <tr key={player.id} className="border-b border-gray-100">
                          <td className="px-4 py-3 font-medium">{player.username}</td>
                          <td className="px-4 py-3 text-gray-600">{player.game_id}</td>
                          <td className="px-4 py-3 text-gray-600">{tournamentData?.title || "Unknown"}</td>
                          <td className="px-4 py-3 text-gray-600">{tournamentData?.game || "Unknown"}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(player.joined_at).toLocaleDateString()}
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
        <section className="mt-10 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold">Organizer Information</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Organizer</p>
              <p className="mt-1 font-medium">{organizer?.organizer_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Organization</p>
              <p className="mt-1 font-medium">{organizer?.organization_name || "Independent Organizer"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
              <p className="mt-1 font-medium">{organizer?.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Phone</p>
              <p className="mt-1 font-medium">{organizer?.phone || "Not provided"}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
