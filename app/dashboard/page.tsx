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

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [joinedTournaments, setJoinedTournaments] = useState<
    JoinedTournament[]
  >([]);
  const [results, setResults] = useState<PlayerResult[]>([]);
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b12] text-white">
        <p className="text-gray-400">Loading dashboard...</p>
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

          <button
            onClick={handleLogout}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold transition hover:border-red-400 hover:text-red-400"
          >
            Logout
          </button>
        </header>

        <section className="py-12">
          <p className="text-sm font-bold uppercase tracking-widest text-green-400">
            Player Dashboard
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Welcome, {profile?.username || "Player"} 👋
          </h1>

          <p className="mt-3 text-gray-400">
            Manage your gaming profile and tournaments.
          </p>
        </section>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
            {errorMessage}
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-3">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-gray-500">
                Username
              </p>

              <p className="mt-2 text-xl font-black">
                {profile?.username}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-gray-500">
                Game
              </p>

              <p className="mt-2 text-xl font-black">
                {profile?.game}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-gray-500">
                Game ID
              </p>

              <p className="mt-2 text-xl font-black">
                {profile?.game_id}
              </p>
            </div>

          </section>
        )}

        <section className="mt-10">

          <div className="flex items-center justify-between">
            <div className="mt-8 grid gap-4 md:grid-cols-3">
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <p className="text-sm font-bold text-gray-500">
      Tournaments Joined
    </p>

    <p className="mt-2 text-3xl font-black text-white">
      {joinedTournaments.length}
    </p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <p className="text-sm font-bold text-gray-500">
      Wins
    </p>

    <p className="mt-2 text-3xl font-black text-yellow-400">
      {results.filter((result) => result.position === 1).length}
    </p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <p className="text-sm font-bold text-gray-500">
      Total Winnings
    </p>

    <p className="mt-2 text-3xl font-black text-green-400">
      ₹
      {results.reduce(
        (total, result) => total + Number(result.prize || 0),
        0
      )}
    </p>
  </div>
</div>
            <h2 className="text-2xl font-black">
              My Tournaments
            </h2>

            <a
              href="/tournaments"
              className="rounded-xl bg-green-400 px-5 py-2.5 text-sm font-black text-black no-underline transition hover:bg-green-300"
            >
              Browse Tournaments
            </a>
          </div>

          {joinedTournaments.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">

              <div className="text-4xl">
                🏆
              </div>

              <h3 className="mt-4 text-xl font-bold">
                No tournaments yet
              </h3>

              <p className="mt-2 text-gray-500">
                Join a tournament and start competing!
              </p>

            </div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2">

              {joinedTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-green-400/40"
                >

                  <div className="flex items-start justify-between">

                    <div>
                      <p className="text-sm font-bold text-green-400">
                        {tournament.game}
                      </p>

                      <h3 className="mt-2 text-xl font-black">
                        {tournament.title}
                      </h3>
                    </div>

                    <span className="rounded-full bg-green-400/10 px-3 py-1 text-xs font-bold text-green-400">
                      {tournament.status}
                    </span>

                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="text-xs text-gray-500">
                        Entry Fee
                      </p>

                      <p className="mt-1 font-black">
                        ₹{tournament.entry_fee}
                      </p>
                    </div>

                    <div className="rounded-xl bg-black/20 p-4">
                      <p className="text-xs text-gray-500">
                        Prize Pool
                      </p>

                      <p className="mt-1 font-black text-green-400">
                        ₹{tournament.prize_pool}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-xl bg-black/20 p-4">
                      <p className="text-xs text-gray-500">
                        Tournament Starts
                      </p>

                      <p className="mt-1 text-sm font-bold">
                        {new Date(
                          tournament.start_time
                        ).toLocaleString()}
                      </p>
                    </div>
                    {tournament.room_id && tournament.room_password && (
  <div className="col-span-2 rounded-xl border border-green-400/20 bg-green-400/5 p-4">
    <p className="text-xs font-bold uppercase tracking-wider text-green-400">
      Room Details
    </p>

    <div className="mt-3 grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs text-gray-500">
          Room ID
        </p>
        <p className="mt-1 font-black">
          {tournament.room_id}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          Password
        </p>
        <p className="mt-1 font-black">
          {tournament.room_password}
        </p>
      </div>
    </div>
  </div>
)}
                    <a
  href={`/tournaments/${tournament.id}`}
  className="mt-4 block w-full rounded-xl bg-green-400 py-3 text-center font-black text-black no-underline transition hover:bg-green-300"
>
  View Tournament
</a>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* My Results & Winnings */}
        {results.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-black">
              🏆 My Results & Winnings
            </h2>

            <p className="mt-2 text-gray-400">
              Your tournament placements and prize winnings
            </p>

            <div className="mt-6 space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 font-black text-black">
                        {result.position}
                      </div>

                      <div>
                        <p className="font-black text-white">
                          {result.username}
                        </p>

                        <p className="text-sm text-gray-400">
                          {result.position === 1
                            ? "1st Place"
                            : result.position === 2
                            ? "2nd Place"
                            : result.position === 3
                            ? "3rd Place"
                            : `${result.position}th Place`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Prize
                      </p>

                      <p className="mt-1 text-xl font-black text-green-400">
                        ₹{result.prize}
                      </p>
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