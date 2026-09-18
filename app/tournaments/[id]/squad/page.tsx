"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  title: string;
  game: string;
  format: "solo" | "squad";
  max_players: number;
  start_time: string;
  end_time: string;
  registration_status?: string;
};

type Squad = {
  id: string;
  squad_name: string;
  captain_id: string;
  status: string;
};

type SquadPlayerCandidate = {
  id: string;
  username: string;
  game_id: string;
};

export default function SquadRegistrationPage() {
  const params = useParams();
  const router = useRouter();

  const tournamentId = params.id as string;

  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [squad, setSquad] =
    useState<Squad | null>(null);

  const [squadName, setSquadName] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [playerSearch, setPlayerSearch] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<SquadPlayerCandidate[]>([]);

const [selectedPlayers, setSelectedPlayers] = useState<SquadPlayerCandidate[]>([]);
const [selectedCaptainId, setSelectedCaptainId] =
  useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
const [joiningSquad, setJoiningSquad] = useState(false);
const [joinMessage, setJoinMessage] = useState("");
const [joinError, setJoinError] = useState("");

  const [searchingPlayers, setSearchingPlayers] =
    useState(false);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, [tournamentId]);

  async function loadPage() {
    setLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

   setCurrentUserId(user.id);

const {
  data: profileData,
  error: profileError,
} = await supabase
  .from("profiles")
  .select("id, username, game_id")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) {
  console.error(
    "Profile loading error:",
    profileError
  );

  setError("Unable to load your player profile.");
  setLoading(false);
  return;
}

if (!profileData) {
  setError("Player profile not found.");
  setLoading(false);
  return;
}

const currentPlayer: SquadPlayerCandidate = {
  id: profileData.id,
  username: profileData.username,
  game_id: profileData.game_id,
};

setSelectedPlayers([currentPlayer]);
setSelectedCaptainId(currentPlayer.id);

    const {
      data: tournamentData,
      error: tournamentError,
    } = await supabase
      .from("tournaments")
      .select(
        "id, title, game, format, max_players, start_time, end_time, registration_status"
      )
      .eq("id", tournamentId)
      .maybeSingle();

    if (tournamentError) {
      console.error(
        "Tournament loading error:",
        tournamentError
      );

      setError("Unable to load tournament.");
      setLoading(false);
      return;
    }

    if (!tournamentData) {
      setError("Tournament not found.");
      setLoading(false);
      return;
    }

    if (tournamentData.format !== "squad") {
      router.push(`/tournaments/${tournamentId}`);
      return;
    }

    setTournament(tournamentData);

    const {
      data: squadData,
      error: squadError,
    } = await supabase
      .from("tournament_squads")
      .select(
        "id, squad_name, captain_id, status"
      )
      .eq("tournament_id", tournamentId)
      .eq("captain_id", user.id)
      .maybeSingle();

    if (squadError) {
      console.error(
        "Squad loading error:",
        squadError
      );
    }

    setSquad(squadData);

    setLoading(false);
  }

  async function searchPlayers() {
    const search = playerSearch.trim();

    if (search.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingPlayers(true);
    setError("");

    const {
      data,
      error: searchError,
    } = await supabase.rpc(
      "search_squad_players",
      {
        p_search: search,
      }
    );

    if (searchError) {
      console.error(
        "Player search error:",
        searchError
      );

      setError(
        "Unable to search players."
      );

      setSearchResults([]);
      setSearchingPlayers(false);
      return;
    }

    setSearchResults(
      (data || []).filter(
        (player: SquadPlayerCandidate) =>
          player.id !== currentUserId &&
          !selectedPlayers.some(
            (selected) =>
              selected.id === player.id
          )
      )
    );

    setSearchingPlayers(false);
  }

  function selectPlayer(
    player: SquadPlayerCandidate
  ) {
    if (selectedPlayers.length >= 4) {
      setError(
        "A squad can have a maximum of 4 players."
      );
      return;
    }

    if (
      selectedPlayers.some(
        (selected) =>
          selected.id === player.id
      )
    ) {
      return;
    }

    setSelectedPlayers([
      ...selectedPlayers,
      player,
    ]);

    setSearchResults(
      searchResults.filter(
        (result) =>
          result.id !== player.id
      )
    );

    setPlayerSearch("");
  }

  function removePlayer(playerId: string) {
    setSelectedPlayers(
      selectedPlayers.filter(
        (player) =>
          player.id !== playerId
      )
    );
  }

 async function createSquad() {
  setMessage("");
  setError("");

  const trimmedName = squadName.trim();

  if (!trimmedName) {
    setError("Please enter a squad name.");
    return;
  }

  if (!tournament) {
    setError(
      "Tournament information is unavailable."
    );
    return;
  }

  if (
    tournament.registration_status ===
    "closed"
  ) {
    setError(
      "Registration for this tournament is closed."
    );
    return;
  }

  if (selectedPlayers.length === 0) {
    setError(
      "Please select at least one player."
    );
    return;
  }

  if (selectedPlayers.length > 4) {
    setError(
      "A squad can have a maximum of 4 players."
    );
    return;
  }

  if (!selectedCaptainId) {
    setError(
      "Please select a squad captain."
    );
    return;
  }

  const captainExists = selectedPlayers.some(
    (player) =>
      player.id === selectedCaptainId
  );

  if (!captainExists) {
    setError(
      "The selected captain must be part of the squad."
    );
    return;
  }

  setCreating(true);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setError(
      "Please login before creating a squad."
    );
    setCreating(false);
    return;
  }

 const joinCode = Math.random()
  .toString(36)
  .substring(2, 8)
  .toUpperCase();

const {
  data: squadData,
  error: squadInsertError,
} = await supabase
  .from("tournament_squads")
  .insert({
    tournament_id: tournamentId,
    squad_name: trimmedName,
    captain_id: selectedCaptainId,
    status: "registered",
    join_code: joinCode,
  })
    .select(
      "id, squad_name, captain_id, status"
    )
    .maybeSingle();

  if (squadInsertError || !squadData) {
    console.error(
      "Squad creation error:",
      squadInsertError
    );

    if (
      squadInsertError?.code ===
      "23505"
    ) {
      setError(
        "This squad name is already being used in this tournament."
      );
    } else {
      setError(
        "Unable to create squad. Please try again."
      );
    }

    setCreating(false);
    return;
  }

  const squadPlayers = selectedPlayers.map(
    (player, index) => ({
      squad_id: squadData.id,
      user_id: player.id,
      player_name: player.username,
      game_id: player.game_id,
      player_slot: index + 1,
      verification_status: "pending",
    })
  );

  const {
    error: playersInsertError,
  } = await supabase
    .from("squad_players")
    .insert(squadPlayers);

  if (playersInsertError) {
    console.error(
      "Squad players creation error:",
      playersInsertError
    );

    await supabase
      .from("tournament_squads")
      .delete()
      .eq("id", squadData.id);

    setError(
      "Squad was created, but the players could not be added. Please try again."
    );

    setCreating(false);
    return;
  }

  setSquad(squadData);
  setSquadName("");

  setMessage(
    "Squad created successfully! 🏆"
  );

  setCreating(false);
}
async function joinExistingSquad() {
  setJoinError("");
  setJoinMessage("");

  const code = joinCode.trim().toUpperCase();

  if (code.length !== 6) {
    setJoinError(
      "Please enter a valid 6-character squad join code."
    );
    return;
  }

  setJoiningSquad(true);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setJoinError(
      "Please login before joining a squad."
    );
    setJoiningSquad(false);
    return;
  }

  if (!tournament) {
    setJoinError(
      "Tournament information is unavailable."
    );
    setJoiningSquad(false);
    return;
  }

  const {
    data,
    error: joinErrorFromRpc,
  } = await supabase.rpc(
    "join_squad_by_code",
    {
      p_tournament_id: tournamentId,
      p_join_code: code,
    }
  );

  if (joinErrorFromRpc) {
    console.error(
      "Join squad RPC error:",
      joinErrorFromRpc
    );

    setJoinError(
      joinErrorFromRpc.message ||
        "Unable to join the squad."
    );

    setJoiningSquad(false);
    return;
  }

  const joinedSquad = Array.isArray(data)
    ? data[0]
    : data;

  if (!joinedSquad) {
    setJoinError(
      "Unable to join the squad."
    );
    setJoiningSquad(false);
    return;
  }

  setJoinMessage(
    `You joined "${joinedSquad.squad_name}" successfully! 🎮`
  );

  setJoinCode("");

  setTimeout(() => {
    router.push(
      `/tournaments/${tournamentId}/squad/${joinedSquad.squad_id}`
    );
  }, 700);

  setJoiningSquad(false);
}

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b12] text-white">
        <p className="text-gray-400">
          Loading squad registration...
        </p>
      </main>
    );
  }

  if (error && !tournament) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b12] px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-2xl font-black">
            Something went wrong
          </h1>

          <p className="mt-3 text-gray-400">
            {error}
          </p>

          <button
            onClick={() =>
              router.push(
                `/tournaments/${tournamentId}`
              )
            }
            className="mt-6 w-full rounded-xl border border-white/10 py-3.5 font-black transition hover:border-green-400 hover:text-green-400"
          >
            ← Back to Tournament
          </button>

        </div>
      </main>
    );
  }

  if (!tournament) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#080b12] px-6 py-8 text-white">

      <div className="mx-auto max-w-3xl">

        <header className="flex items-center justify-between border-b border-white/10 pb-6">

          <a
            href="/"
            className="text-2xl font-black no-underline"
          >
            GAME
            <span className="text-green-400">
              ARENA
            </span>
          </a>

          <button
            onClick={() =>
              router.push(
                `/tournaments/${tournamentId}`
              )
            }
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold transition hover:border-green-400 hover:text-green-400"
          >
            ← Back
          </button>

        </header>

        <section className="py-10">

          <p className="text-sm font-bold uppercase tracking-widest text-green-400">
            {tournament.game} • SQUAD
          </p>

          <h1 className="mt-3 text-4xl font-black">
            {tournament.title}
          </h1>

          <p className="mt-3 text-gray-400">
            Create your squad and select your
            teammates for this tournament.
          </p>

        </section>

        {message && (
          <div className="mb-6 rounded-xl border border-green-400/20 bg-green-400/10 p-4 text-center font-bold text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-center font-bold text-red-400">
            {error}
          </div>
        )}

{!squad ? (

  <div>

    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">

            <div className="text-5xl">
              🎮
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Create Your Squad
            </h2>

            <p className="mt-2 text-gray-400">
              Choose your squad name and select
              your teammates.
            </p>

            <div className="mt-8">

              <label className="text-sm font-bold text-gray-300">
                Squad Name
              </label>

              <input
                type="text"
                value={squadName}
                onChange={(event) =>
                  setSquadName(
                    event.target.value
                  )
                }
                placeholder="Enter your squad name"
                maxLength={40}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-green-400"
              />

            </div>

            <div className="mt-8">

              <div className="flex items-center justify-between">

                <label className="text-sm font-bold text-gray-300">
                  Select Teammates
                </label>

                <span className="text-xs font-bold text-gray-500">
                  {selectedPlayers.length}/4 selected
                </span>

              </div>

              <div className="mt-2 flex gap-2">

                <input
                  type="text"
                  value={playerSearch}
                  onChange={(event) =>
                    setPlayerSearch(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      searchPlayers();
                    }
                  }}
                  placeholder="Search by username or BGMI ID"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-green-400"
                />

                <button
                  type="button"
                  onClick={searchPlayers}
                  disabled={
                    searchingPlayers ||
                    playerSearch.trim()
                      .length < 2 ||
                    selectedPlayers.length >= 4
                  }
                  className="rounded-xl bg-white/10 px-5 py-3 font-bold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {searchingPlayers
                    ? "Searching..."
                    : "Search"}
                </button>

              </div>

              {searchResults.length >
                0 && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">

                  {searchResults.map(
                    (player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() =>
                          selectPlayer(
                            player
                          )
                        }
                        className="flex w-full items-center justify-between border-b border-white/5 px-4 py-4 text-left transition last:border-b-0 hover:bg-white/[0.05]"
                      >

                        <div>

                          <p className="font-bold text-white">
                            {player.username}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            BGMI ID:{" "}
                            {player.game_id}
                          </p>

                        </div>

                        <span className="rounded-lg bg-green-400/10 px-3 py-1.5 text-xs font-black text-green-400">
                          Add
                        </span>

                      </button>
                    )
                  )}

                </div>
              )}

              {playerSearch.trim().length >=
                2 &&
                !searchingPlayers &&
                searchResults.length ===
                  0 && (
                  <p className="mt-3 text-sm text-gray-500">
                    No available players found.
                  </p>
                )}

            </div>

            {selectedPlayers.length >
              0 && (
              <div className="mt-8">

                <p className="text-sm font-bold text-gray-300">
                  Selected Players
                </p>

                <div className="mt-3 space-y-3">

                  {selectedPlayers.map(
                    (player, index) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4"
                      >

                        <div className="flex items-center gap-4">

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-400/10 text-sm font-black text-green-400">
                            {index + 1}
                          </div>

                          <div>

                            <p className="font-bold text-white">
                              {player.username}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              BGMI ID:{" "}
                              {player.game_id}
                            </p>

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removePlayer(
                              player.id
                            )
                          }
                          className="rounded-lg border border-red-400/20 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-400/10"
                        >
                          Remove
                        </button>
                        <div className="mt-6">

  <p className="text-sm font-bold text-gray-300">
    Choose Captain
  </p>

  <p className="mt-1 text-xs text-gray-500">
    Select one player who will be the squad captain.
  </p>

  <div className="mt-3 space-y-3">

    {selectedPlayers.map((player) => (
      <button
        key={`captain-${player.id}`}
        type="button"
        onClick={() =>
          setSelectedCaptainId(player.id)
        }
        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
          selectedCaptainId === player.id
            ? "border-green-400 bg-green-400/10"
            : "border-white/10 bg-black/20 hover:border-white/20"
        }`}
      >

        <div>

          <p className="font-bold text-white">
            {player.username}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            BGMI ID: {player.game_id}
          </p>

        </div>

        {selectedCaptainId === player.id ? (
          <span className="rounded-lg bg-green-400/10 px-3 py-1.5 text-xs font-black text-green-400">
            👑 Captain
          </span>
        ) : (
          <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-500">
            Select
          </span>
        )}

      </button>
    ))}

  </div>

</div>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            <button
              onClick={createSquad}
              disabled={
                creating ||
                selectedPlayers.length ===
                  0
              }
              className="mt-8 w-full rounded-xl bg-green-400 py-4 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Creating Squad..."
                : "Continue →"}
            </button>

                        <p className="mt-3 text-center text-xs text-gray-600">
              Captain selection will be added
              in the next step.
            </p>

          </section>

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#111722] p-6">

            <h2 className="text-xl font-black text-white">
              Join Existing Squad
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Already have a squad join code? Enter it below to join that squad.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">

              <input
                type="text"
                value={joinCode}
                onChange={(event) =>
                  setJoinCode(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 6)
                  )
                }
                placeholder="Enter 6-character code"
                maxLength={6}
                className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-bold text-white outline-none placeholder:text-gray-600 focus:border-green-400/50"
              />

              <button
                type="button"
                onClick={joinExistingSquad}
                disabled={
                  joiningSquad ||
                  joinCode.length !== 6
                }
                className="rounded-xl bg-green-400 px-5 py-3 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {joiningSquad
                  ? "Joining..."
                  : "Join Squad"}
              </button>

            </div>

            {joinError && (
              <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm font-bold text-red-400">
                {joinError}
              </p>
            )}

            {joinMessage && (
              <p className="mt-4 rounded-xl border border-green-400/20 bg-green-400/5 px-4 py-3 text-sm font-bold text-green-400">
                {joinMessage}
              </p>
            )}

          </div>

        </div>

        ) : (

          <div>

            <section className="rounded-2xl border border-green-400/20 bg-green-400/5 p-8">
            <div className="flex items-start justify-between gap-4">

              <div>
                

                <p className="text-sm font-bold uppercase tracking-widest text-green-400">
                  Squad Created
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {squad.squad_name}
                </h2>

              </div>

              <div className="rounded-full bg-green-400/10 px-4 py-2 text-sm font-bold text-green-400">
                Registered
              </div>

            </div>

            <div className="mt-8 rounded-2xl bg-black/20 p-6">

              <h3 className="text-lg font-black">
                Selected Players
              </h3>

              <div className="mt-4 space-y-2">

                {selectedPlayers.map(
                  (player) => (
                    <div
                      key={player.id}
                      className="rounded-xl border border-white/10 px-4 py-3"
                    >
                      <p className="font-bold">
                        {player.username}
                      </p>

                      <p className="text-xs text-gray-500">
                        BGMI ID:{" "}
                        {player.game_id}
                      </p>
                    </div>
                  )
                )}

              </div>

              <p className="mt-6 text-sm text-gray-400">
                The next step will let you choose
                which selected player is the captain.
              </p>

              <button
                onClick={() =>
                  router.push(
                    `/tournaments/${tournamentId}/squad/${squad.id}`
                  )
                }
                className="mt-5 w-full rounded-xl bg-green-400 py-4 font-black text-black transition hover:bg-green-300"
              >
                Continue to Manage Squad →
              </button>

            </div>

            </section>

          </div>

        )}
      </div>

    </main>
  );
}