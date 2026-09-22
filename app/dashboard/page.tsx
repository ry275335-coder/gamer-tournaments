"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  username: string;
  game: string;
  game_id: string;
};

type JoinedTournament = {
  id: string;
  title: string;
  game: string;
  entry_fee: number;
  prize_pool: number;
  start_time: string;
  status: string;
  room_id?: string | null;
  room_password?: string | null;
};

type PlayerResult = {
  id: string;
  username: string;
  position: number;
  prize: number;
  tournament_id: string;
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

type CollegeTournament = {
  id: string;
  title: string;
  game: string;
  entry_fee: number;
  prize_pool: number;
  start_time: string;
  end_time: string;
  status: string;
  player_count: number;
  max_players: number;
  countdown: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [joinedTournaments, setJoinedTournaments] = useState<
    JoinedTournament[]
  >([]);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [collegeTournaments, setCollegeTournaments] = useState<CollegeTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username, game, game_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile loading error:", profileError);
        setErrorMessage("Unable to load your profile.");
        setLoading(false);
        return;
      }

      if (!profileData) {
        setErrorMessage("Your profile could not be found.");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Load college verification status
      const { data: verificationData } = await supabase
        .from('college_verifications')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load college tournaments
      let loadedCollegeTournaments: CollegeTournament[] = [];
      let { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          id,
          title,
          game,
          entry_fee,
          prize_pool,
          start_time,
          end_time,
          status,
          max_players,
          scope,
          is_college_only
        `)
        .or('is_college_only.eq.true,scope.not.is.null')
        .order('start_time', { ascending: true });

      if (tournamentError && tournamentError.message?.includes('does not exist')) {
        const fallback = await supabase
          .from('tournaments')
          .select('id, title, game, entry_fee, prize_pool, start_time, end_time, status, max_players')
          .eq('college_id', user.id)
          .order('start_time', { ascending: true });
        tournamentData = fallback.data as any;
      }

      if (tournamentData && tournamentData.length > 0) {
        const tournamentsWithCount = await Promise.all(
          tournamentData.map(async (tournament) => {
            const { count } = await supabase
              .from('tournament_players')
              .select('*', { count: 'exact', head: true })
              .eq('tournament_id', tournament.id);

            const now = new Date();
            const startTime = new Date(tournament.start_time);
            const endTime = new Date(tournament.end_time);

            let currentStatus = 'upcoming';
            let difference = 0;

            if (now >= endTime) {
              currentStatus = 'completed';
            } else if (now >= startTime) {
              currentStatus = 'live';
            }

            if (now < startTime) {
              difference = startTime.getTime() - now.getTime();
            } else if (now < endTime) {
              difference = endTime.getTime() - now.getTime();
            }

            let countdown = 'Tournament ended';

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

              countdown = `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;
            }

            return {
              ...tournament,
              status: currentStatus,
              player_count: count || 0,
              countdown,
            };
          })
        );

        setCollegeTournaments(tournamentsWithCount);
      }

      const { data: joinedData, error: joinedError } = await supabase
        .from("tournament_players")
        .select(`
          id,
          joined_at,
          tournaments (
            id,
            title,
            game,
            entry_fee,
            prize_pool,
            start_time,
            status
          )
        `)
        .eq("player_id", user.id)
        .order("joined_at", { ascending: false });

      if (joinedError) {
        console.error("Joined tournaments error:", joinedError);
      } else {
        const formattedTournaments: JoinedTournament[] = [];

        for (const item of joinedData || []) {
          const tournament = Array.isArray(item.tournaments)
            ? item.tournaments[0]
            : item.tournaments;

          if (tournament) {
            const { data: roomData, error: roomError } = await supabase
              .from("tournament_rooms")
              .select("room_id, room_password")
              .eq("tournament_id", tournament.id)
              .maybeSingle();

            if (roomError) {
              console.error("Room loading error:", roomError);
            }

            formattedTournaments.push({
              ...(tournament as JoinedTournament),
              room_id: roomData?.room_id || null,
              room_password: roomData?.room_password || null,
            });
          }
        }

        setJoinedTournaments(formattedTournaments);
        setCollegeTournaments(collegeTournaments);

        const { data: resultData, error: resultError } = await supabase
          .from("tournament_results")
          .select("id, username, position, prize, tournament_id")
          .eq("player_id", user.id)
          .order("position", { ascending: true });

        if (resultError) {
          console.error("Results loading error:", resultError);
          setResults([]);
        } else {
          setResults(resultData || []);
        }
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }
  async function handleOrganizerClick() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    router.push("/login");
    return;
  }

  const { data: organizer, error } = await supabase
    .from("organizers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Organizer check error:", error);
    return;
  }

  if (organizer) {
    router.push("/organizer");
    return;
  }

  router.push("/organizer/apply");
}

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-black">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-100 rounded"></div>
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

          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-400 hover:text-red-600"
          >
            Logout
          </button>
        </header>

        {/* Welcome */}
        <section className="py-8">
          <h1 className="text-2xl font-bold">Welcome, {profile?.username || "Player"}</h1>
          <p className="mt-1 text-gray-600">Manage your gaming profile and tournaments.</p>
        </section>

        {/* Profile */}
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
            {errorMessage}
          </div>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Username</p>
                <p className="mt-1 font-semibold">{profile?.username}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Game</p>
                <p className="mt-1 font-semibold">{profile?.game}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Game ID</p>
                <p className="mt-1 font-semibold">{profile?.game_id}</p>
              </div>
            </section>

            {/* Stats */}
            <section className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Tournaments</p>
                <p className="mt-1 text-2xl font-bold">{joinedTournaments.length}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Wins</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  {results.filter((result) => result.position === 1).length}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-xs font-medium text-gray-500">Winnings</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  ₹{results.reduce((total, result) => total + Number(result.prize || 0), 0)}
                </p>
              </div>
            </section>
          </>
        )}

        {/* Actions */}
        <section className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/tournaments"
            className="rounded-lg bg-green-600 px-5 py-2.5 text-center font-medium text-white no-underline transition hover:bg-green-500"
          >
            Browse Tournaments
          </a>
          <button
            onClick={handleOrganizerClick}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-center font-medium text-gray-700 transition hover:border-green-600 hover:text-green-600"
          >
            Become an Organizer
          </button>
          <a
            href="/tournaments/private"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-center font-medium text-gray-700 no-underline transition hover:border-purple-600 hover:text-purple-600"
          >
            Join Private Tournament
          </a>
        </section>

        {/* My Tournaments */}
        <section className="mt-10">
          <h2 className="text-xl font-bold">My Tournaments</h2>

          {joinedTournaments.length === 0 ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-gray-600">No tournaments joined yet.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {joinedTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-green-300"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">{tournament.game}</p>
                      <h3 className="mt-1 font-semibold">{tournament.title}</h3>
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-600">
                      {tournament.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Fee</span>
                      <span className="font-medium">₹{tournament.entry_fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prize Pool</span>
                      <span className="font-medium text-green-600">₹{tournament.prize_pool}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Starts</span>
                      <span className="font-medium">{new Date(tournament.start_time).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {tournament.room_id && tournament.room_password && (
                    <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="text-xs font-medium text-green-600">Room Details</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">ID: </span>
                          <span className="font-medium">{tournament.room_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pass: </span>
                          <span className="font-medium">{tournament.room_password}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <a
                    href={`/tournaments/${tournament.id}`}
                    className="mt-4 block w-full rounded-lg bg-green-600 py-2.5 text-center font-medium text-white no-underline transition hover:bg-green-500"
                  >
                    View Tournament
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My College Tournaments */}
        {collegeTournaments.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold">My College Tournaments</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {collegeTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-green-300"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">{tournament.game}</p>
                      <h3 className="mt-1 font-semibold">{tournament.title}</h3>
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-600">
                      {tournament.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
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
                  </div>

                  <a
                    href={`/tournaments/${tournament.id}`}
                    className="mt-4 block w-full rounded-lg bg-green-600 py-2.5 text-center font-medium text-white no-underline transition hover:bg-green-500"
                  >
                    View Tournament
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        {results.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold">My Results</h2>

            <div className="mt-4 space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 font-bold text-yellow-600">
                        {result.position}
                      </div>
                      <div>
                        <p className="font-semibold">{result.username}</p>
                        <p className="text-sm text-gray-600">
                          {result.position === 1 ? "1st Place" : result.position === 2 ? "2nd Place" : result.position === 3 ? "3rd Place" : `${result.position}th Place`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Prize</p>
                      <p className="font-semibold text-green-600">₹{result.prize}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}