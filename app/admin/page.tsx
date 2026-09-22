"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { updateCollegeVerificationStatus } from "@/lib/supabase";

type Tournament = {
  registration_status?: string;
  is_private?: boolean;
  access_number?: string | null;
  access_password?: string | null;
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
  room_id: string | null;
  room_password: string | null;
};

type CollegeVerification = {
  id: string;
  user_id: string;
  college_name: string;
  student_id_image_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
};

type TournamentReport = {
  id: string;
  tournament_id: string;
  reported_by?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed';
  created_at: string;
  updated_at: string;
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentFilter, setTournamentFilter] = useState("all");
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [playerSearch, setPlayerSearch] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});

  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

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

  const [isPrivate, setIsPrivate] = useState(false);
  const [accessNumber, setAccessNumber] = useState("");
  const [accessPassword, setAccessPassword] = useState("");

  const [resultTournamentId, setResultTournamentId] = useState("");
  const [resultPlayerId, setResultPlayerId] = useState("");
  const [resultPosition, setResultPosition] = useState("1");
  const [resultPrize, setResultPrize] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  const [recentWinners, setRecentWinners] = useState<any[]>([]);

  // College verification state
  const [collegeVerifications, setCollegeVerifications] = useState<CollegeVerification[]>([]);
  const [loadingVerifications, setLoadingVerifications] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Tournament reports state
  const [tournamentReports, setTournamentReports] = useState<TournamentReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

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

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setLoading(false);
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
      loadRecentWinners();
      loadCollegeVerifications();
      loadTournamentReports();
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
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("tournament_id", tournament.id);

        counts[tournament.id] = count || 0;
      }

      setPlayerCounts(counts);
    }

    setLoadingTournaments(false);
  }

  function getTournamentStatus(startTime: string, endTime: string) {
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
      .order("joined_at", {
        ascending: false,
      });

    if (!error && data) {
      setPlayers(data);
    }

    setLoadingPlayers(false);
  }

  async function loadRecentWinners() {
    const { data, error } = await supabase
      .from("tournament_results")
      .select(`
        id,
        username,
        position,
        prize,
        tournament_id,
        created_at,
        tournaments (
          title,
          game
        )
      `)
      .eq("position", 1)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Recent winners loading error:", error);
      return;
    }

    setRecentWinners(data || []);
  }

  async function loadCollegeVerifications() {
    setLoadingVerifications(true);
    setVerificationError(null);

    const { data, error } = await supabase
      .from('college_verifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading college verifications:', error);
      setVerificationError('Failed to load verification requests');
      setLoadingVerifications(false);
      return;
    }

    setCollegeVerifications(data || []);
    setLoadingVerifications(false);
  }

  async function loadTournamentReports() {
    setLoadingReports(true);
    setReportsError(null);

    const { data, error } = await supabase
      .from('tournament_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tournament reports:', error);
      setReportsError('Failed to load tournament reports');
      setLoadingReports(false);
      return;
    }

    setTournamentReports(data || []);
    setLoadingReports(false);
  }

  async function removeRecentWinner(resultId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this winner from Recent Winners?"
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("tournament_results")
      .delete()
      .eq("id", resultId);

    if (error) {
      console.error("Remove recent winner error:", error);
      setMessage(`Unable to remove winner: ${error.message}`);
      return;
    }

    setRecentWinners((current) =>
      current.filter((winner) => winner.id !== resultId)
    );

    setMessage("Recent winner removed successfully.");
  }

  function generateAccessNumber() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function generateAccessPassword() {
    const characters =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    let password = "";

    for (let i = 0; i < 8; i++) {
      password += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return password;
  }

  async function createTournament(e: React.FormEvent) {
    e.preventDefault();

    setCreating(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("User not logged in");
      setCreating(false);
      return;
    }

    const finalAccessNumber = isPrivate
      ? accessNumber || generateAccessNumber()
      : null;

    const finalAccessPassword = isPrivate
      ? accessPassword || generateAccessPassword()
      : null;

    const { data: tournament, error } = await supabase
      .from("tournaments")
      .insert({
        title,
        game,
        format,
        entry_fee: Number(entryFee),
        prize_pool: Number(prizePool),
        max_players: Number(maxPlayers),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        status: "upcoming",
        registration_status: registrationStatus,
        room_id: roomId,
        room_password: roomPassword,
        is_private: isPrivate,
        access_number: finalAccessNumber,
        access_password: finalAccessPassword,
        college_id: user.id,
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

    setMessage(
      isPrivate
        ? "Private tournament created successfully!"
        : "Tournament created successfully!"
    );

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

    setRegistrationStatus(tournament.registration_status || "open");

    setIsPrivate(tournament.is_private || false);

    setAccessNumber(tournament.access_number || "");

    setAccessPassword(tournament.access_password || "");

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

    const finalAccessNumber = isPrivate
      ? accessNumber || generateAccessNumber()
      : null;

    const finalAccessPassword = isPrivate
      ? accessPassword || generateAccessPassword()
      : null;

    const { data: updatedTournament, error } = await supabase
      .from("tournaments")
      .update({
        title,
        game,
        format,
        entry_fee: Number(entryFee),
        prize_pool: Number(prizePool),
        max_players: Number(maxPlayers),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        registration_status: registrationStatus,
        room_id: roomId,
        room_password: roomPassword,
        is_private: isPrivate,
        access_number: finalAccessNumber,
        access_password: finalAccessPassword,
      })
      .eq("id", editingId)
      .select("registration_status, is_private, access_number, access_password")
      .maybeSingle();

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
        await supabase.from("tournament_rooms").insert({
          tournament_id: editingId,
          room_id: roomId,
          room_password: roomPassword,
        });
      }
    }

    setRegistrationStatus(updatedTournament?.registration_status || "open");

    setIsPrivate(updatedTournament?.is_private || false);

    setAccessNumber(updatedTournament?.access_number || "");

    setAccessPassword(updatedTournament?.access_password || "");

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
      <main className="flex min-h-screen items-center justify-center bg-white text-black">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-black">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <a href="/" className="text-2xl font-bold text-black no-underline">
              GAME<span className="text-green-600">ARENA</span>
            </a>

            <h1 className="mt-6 text-2xl font-bold">Admin Login</h1>
            <p className="mt-2 text-sm text-gray-600">Login with your administrator account.</p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();

              const form = e.currentTarget;
              const emailInput = form.elements.namedItem("email") as HTMLInputElement;
              const passwordInput = form.elements.namedItem("password") as HTMLInputElement;

              const email = emailInput.value.trim();
              const password = passwordInput.value;

              if (!email || !password) {
                alert("Please enter your email and password.");
                return;
              }

              const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
              });

              if (error || !data.user) {
                alert("Incorrect email or password. Please try again.");
                return;
              }

              const ADMIN_USER_ID = "6431960a-b0c6-4e2a-8b1a-d5017ceae103";

              if (data.user.id !== ADMIN_USER_ID) {
                await supabase.auth.signOut();
                alert("This account is not authorized for Admin Login.");
                return;
              }

              window.location.reload();
            }}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email Address
              </label>

              <input
                name="email"
                type="email"
                placeholder="Enter admin email"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>

              <input
                name="password"
                type="password"
                placeholder="Enter admin password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500"
            >
              Admin Login
            </button>

            <a
              href="/"
              className="mt-4 block text-center text-sm text-gray-600 hover:text-green-600 no-underline"
            >
              ← Back to Home
            </a>
          </form>
        </div>
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
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">Create and manage GameArena tournaments.</p>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total Tournaments</p>
            <p className="mt-1 text-2xl font-bold">{tournaments.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total Players</p>
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

        <div className="mt-10">
          <h2 className="text-xl font-bold">
            {editingId ? "Edit Tournament" : "Create Tournament"}
          </h2>

          <form
            onSubmit={editingId ? saveTournament : createTournament}
            className="mt-6 space-y-6 rounded-lg border border-gray-200 bg-white p-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tournament Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="GameArena Battle #1"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Game
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
                  Tournament Format
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
                  Maximum Players
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
                  Entry Fee (₹)
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
                  Prize Pool (₹)
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
                  Tournament Start
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
                  Tournament End
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

                    if (privateTournament) {
                      setAccessNumber(generateAccessNumber());
                      setAccessPassword(generateAccessPassword());
                    } else {
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
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 font-medium tracking-widest text-green-600 outline-none"
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
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 font-medium tracking-widest text-green-600 outline-none"
                      />
                    </div>
                  </div>

                  <p className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                    Give this Tournament Number and Password only to the participants you want to allow.
                  </p>
                </>
              )}
            </div>

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

            {message && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={creating || savingEdit}
              className="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                  setEditingId(null);
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
                  setMessage("");
                }}
                className="w-full rounded-lg border border-gray-300 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold">Manage Tournaments</h2>

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
            <p className="mt-4 text-gray-600">Loading tournaments...</p>
          ) : tournaments.length === 0 ? (
            <p className="mt-4 text-gray-600">No tournaments found.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {paginatedTournaments.map((tournament) => {
                const status = getTournamentStatus(
                  tournament.start_time,
                  tournament.end_time
                );

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

                          {tournament.is_private && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-600">
                              PRIVATE
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-gray-600">{tournament.game}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(tournament)}
                          className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                        >
                          Edit
                        </button>

                        <a
                          href={`/tournaments/${tournament.id}`}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 no-underline transition hover:bg-gray-50"
                        >
                          View
                        </a>

                        <button
                          onClick={() => deleteTournament(tournament.id)}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {tournament.is_private && (
                      <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-purple-600">
                          Private Access
                        </p>

                        <div className="mt-2 flex gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Number: </span>
                            <span className="font-medium">{tournament.access_number || "Not set"}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Password: </span>
                            <span className="font-medium">{tournament.access_password || "Not set"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2 md:grid-cols-5">
                      <div>
                        <p className="text-xs text-gray-500">Entry Fee</p>
                        <p className="font-medium">₹{tournament.entry_fee}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Prize Pool</p>
                        <p className="font-medium text-green-600">₹{tournament.prize_pool}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Max Players</p>
                        <p className="font-medium">{tournament.max_players}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Registered</p>
                        <p className="font-medium">{playerCounts[tournament.id] || 0} / {tournament.max_players}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Registration</p>
                        <p
                          className={`font-medium ${
                            tournament.registration_status === "closed" ||
                            (playerCounts[tournament.id] || 0) >= tournament.max_players
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {tournament.registration_status === "closed"
                            ? "CLOSED"
                            : (playerCounts[tournament.id] || 0) >= tournament.max_players
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
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold">Tournament Results</h2>
          <p className="mt-1 text-sm text-gray-600">Add winners and prizes for completed tournaments.</p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();

              if (!resultTournamentId || !resultPlayerId || !resultPosition) {
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

              const { data: insertedResult, error } = await supabase
                .from("tournament_results")
                .insert({
                  tournament_id: resultTournamentId,
                  player_id: selectedPlayer.player_id,
                  username: selectedPlayer.username,
                  position: Number(resultPosition),
                  prize: Number(resultPrize || 0),
                })
                .select()
                .single();

              if (error) {
                console.error("RESULT INSERT ERROR:", error);
                setMessage(`Failed to save result: ${error.message}`);
                setSavingResult(false);
                return;
              }

              console.log("RESULT SAVED:", insertedResult);
              setMessage("Tournament result added successfully!");

              setResultPlayerId("");
              setResultPosition("1");
              setResultPrize("");
              setSavingResult(false);
            }}
          >
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
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

                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.title}
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
                        <option key={player.id} value={player.player_id}>
                          {player.username} — {player.game_id}
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
            </div>
          </form>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold">Recent Winners</h2>
          <p className="mt-1 text-sm text-gray-600">Winners shown on the public homepage.</p>

          {recentWinners.length === 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
              No recent winners found.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentWinners.map((winner) => {
                const tournamentData = Array.isArray(winner.tournaments)
                  ? winner.tournaments[0]
                  : winner.tournaments;

                return (
                  <div
                    key={winner.id}
                    className="flex flex-col gap-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{winner.username}</h3>

                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          #1 Winner
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-600">
                        {tournamentData?.title || "Tournament"}
                        {tournamentData?.game ? ` • ${tournamentData.game}` : ""}
                      </p>

                      <p className="mt-1 text-sm font-medium text-green-600">
                        Prize: ₹{winner.prize || 0}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRecentWinner(winner.id)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* College Verifications Section */}
        <div className="mt-10">
          <h2 className="text-xl font-bold">Organizer Applications</h2>
          <p className="mt-1 text-sm text-gray-600">Review and approve college organizer verification requests.</p>

          {loadingVerifications ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
              Loading organizer applications...
            </div>
          ) : verificationError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
              {verificationError}
            </div>
          ) : collegeVerifications.length === 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
              No organizer applications pending.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {collegeVerifications.map((verification) => (
                <div
                  key={verification.id}
                  className="rounded-lg border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">{verification.college_name}</h3>
                      <p className="text-sm text-gray-600">
                        Submitted by: {verification.user_id}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        verification.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : verification.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                    </span>
                  </div>

                  {verification.student_id_image_url && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-gray-700">College Logo:</p>
                      <img
                        src={verification.student_id_image_url}
                        alt={`${verification.college_name} logo`}
                        className="max-w-xs h-auto rounded border border-gray-200"
                      />
                    </div>
                  )}

                  {verification.status === "pending" && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() =>
                          updateCollegeVerificationStatus(verification.id, "approved")
                            .then(() => {
                              setVerificationError(null);
                              loadCollegeVerifications(); // Refresh the list
                            })
                            .catch((error) => {
                              setVerificationError("Failed to approve verification");
                              console.error(error);
                            })}
                        className="flex-1 rounded-lg bg-green-600 py-2.5 font-medium text-white transition hover:bg-green-500"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          updateCollegeVerificationStatus(verification.id, "rejected")
                            .then(() => {
                              setVerificationError(null);
                              loadCollegeVerifications(); // Refresh the list
                            })
                            .catch((error) => {
                              setVerificationError("Failed to reject verification");
                              console.error(error);
                            })}
                        className="flex-1 rounded-lg border border-red-300 py-2.5 font-medium text-red-600 transition hover:border-red-500 hover:text-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tournament Reports Section */}
        <div className="mt-10">
          <h2 className="text-xl font-bold">Tournament Reports</h2>
          <p className="mt-1 text-sm text-gray-600">Review reports of spam, fake, or inappropriate tournaments.</p>

          {loadingReports ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
              Loading tournament reports...
            </div>
          ) : reportsError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
              {reportsError}
            </div>
          ) : tournamentReports.length === 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
              No tournament reports found.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {tournamentReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">Tournament Report</h3>
                      <p className="text-sm text-gray-600">
                        Reported on: {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        report.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : report.status === "reviewed"
                            ? "bg-blue-100 text-blue-800"
                            : report.status === "dismissed"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                      }`}
                    >
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Reason:</span>
                      <p className="text-sm text-gray-600">{report.reason}</p>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Reported by:</span>
                      <p className="text-sm text-gray-600">{report.reported_by || "Anonymous"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold">Registered Players</h2>

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
            <p className="mt-4 text-gray-600">Loading players...</p>
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
                          <td className="px-4 py-3 text-gray-600">
                            {tournamentData?.title || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {tournamentData?.game || "Unknown"}
                          </td>
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
        </div>

      </div>
    </main>
  );
}
