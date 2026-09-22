"use client";

import { ChangeEvent, useEffect, useState } from "react";
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
  is_winner: boolean;
  join_code: string;
};

type SquadPlayer = {
  id: string;
  squad_id: string;
  user_id: string;
  player_name: string;
  game_id: string;
  player_slot: number;
  id_screenshot_url: string | null;
  verification_status: string;
};

export default function ManageSquadPage() {
  const params = useParams();
  const router = useRouter();

  const tournamentId = params.id as string;
  const squadId = params.squadId as string;

  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [squad, setSquad] =
    useState<Squad | null>(null);

  const [players, setPlayers] =
    useState<SquadPlayer[]>([]);
  const [submission, setSubmission] =
    useState<{
      id: string;
      tournament_id: string;
      squad_id: string;
      submitted_by: string;
      total_kills: number;
      result_screenshot_url: string | null;
      status: string;
      organizer_note: string | null;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
    } | null>(null);

  const [loading, setLoading] =
    useState(true);
  const [playerKills, setPlayerKills] = useState<Record<string, number>>({});
  const [resultScreenshot, setResultScreenshot] = useState<File | null>(null);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");
  const [isCaptain, setIsCaptain] = useState(false);

  const [error, setError] =
    useState("");

  const [playerUsername, setPlayerUsername] =
    useState("");

  const [selectedSlot, setSelectedSlot] =
    useState(1);

  useEffect(() => {
    loadSquad();

    const channel = supabase
      .channel(`tournament-squad-${squadId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_squads",
          filter: `id=eq.${squadId}`,
        },
        (payload) => {
          console.log(
            "SQUAD REALTIME UPDATE:",
            payload
          );

          const updatedSquad =
            payload.new as Squad;

          setSquad((currentSquad) =>
            currentSquad
              ? {
                  ...currentSquad,
                  ...updatedSquad,
                }
              : updatedSquad
          );
        }
      )
      .subscribe((status) => {
        console.log(
          "SQUAD REALTIME STATUS:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, squadId]);

  async function loadSquad() {
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
      data: membership,
      error: membershipError,
    } = await supabase
      .from("squad_players")
      .select("id")
      .eq("squad_id", squadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Squad membership check error:",
        membershipError
      );
    } else if (!membership) {
      router.push(
        `/tournaments/${tournamentId}/squad`
      );
      return;
    }

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

    if (tournamentError || !tournamentData) {
      console.error(
        "Tournament loading error:",
        tournamentError
      );

      setError("Tournament could not be found.");
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
        "id, squad_name, captain_id, status, is_winner, join_code"
      )
      .eq("id", squadId)
      .eq("tournament_id", tournamentId)
      .maybeSingle();

    if (squadError || !squadData) {
      console.error(
        "Squad loading error:",
        squadError
      );

      setError("Squad could not be found.");
      setLoading(false);
      return;
    }

    setIsCaptain(squadData.captain_id === user.id);

    setSquad(squadData);

    const {
      data: captainPlayer,
      error: captainPlayerError,
    } = await supabase
      .from("squad_players")
      .select("id")
      .eq("squad_id", squadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (captainPlayerError) {
      console.error(
        "Captain player check error:",
        captainPlayerError
      );
    }

    const {
      data: playerData,
      error: playerError,
    } = await supabase
      .from("squad_players")
      .select(
        "id, squad_id, user_id, player_name, game_id, player_slot, id_screenshot_url, verification_status"
      )
      .eq("squad_id", squadId)
      .order("player_slot", {
        ascending: true,
      });

    if (playerError) {
      console.error(
        "Squad players loading error:",
        playerError
      );

      setError("Unable to load squad players.");
    }

    setPlayers(playerData || []);
    const {
      data: submissionData,
      error: submissionError,
    } = await supabase
      .from("squad_match_submissions")
      .select(
        "id, tournament_id, squad_id, submitted_by, total_kills, result_screenshot_url, status, organizer_note, reviewed_by, reviewed_at, created_at"
      )
      .eq("tournament_id", tournamentId)
      .eq("squad_id", squadId)
      .maybeSingle();

    if (submissionError) {
      console.error(
        "Match submission loading error:",
        submissionError
      );
    } else {
      setSubmission(submissionData);
    }
    console.log(
      "CAPTAIN ID:",
      squadData.captain_id
    );

    console.log(
      "PLAYER IDS:",
      (playerData || [])
        .map(
          (player) =>
            `${player.player_name} = ${player.user_id}`
        )
        .join(" | ")
    );
    const usedSlots = (playerData || []).map(
      (player) => player.player_slot
    );

    const firstAvailableSlot = [1, 2, 3, 4].find(
      (slot) => !usedSlots.includes(slot)
    );

    if (firstAvailableSlot) {
      setSelectedSlot(firstAvailableSlot);
    }

    setLoading(false);
  }

  async function addPlayer() {
    setMessage("");
    setError("");

    if (!squad) {
      setError("Squad information is unavailable.");
      return;
    }

    if (!playerUsername.trim()) {
      setError(
        "Please enter the player's GameArena username."
      );
      return;
    }

    if (players.length >= 4) {
      setError(
        "Your squad already has 4 players."
      );
      return;
    }

    const slotAlreadyUsed = players.some(
      (player) =>
        player.player_slot === selectedSlot
    );

    if (slotAlreadyUsed) {
      setError(
        "This player slot is already occupied."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please login again.");
      setSaving(false);
      return;
    }

    const {
      data: foundPlayers,
      error: searchError,
    } = await supabase.rpc(
      "find_player_by_username",
      {
        search_username:
          playerUsername.trim(),
      }
    );

    if (searchError) {
      console.error(
        "Player search error:",
        searchError
      );

      setError(
        "Unable to search for this player."
      );

      setSaving(false);
      return;
    }

    const foundPlayer = foundPlayers?.[0];

    if (!foundPlayer) {
      setError(
        "No GameArena player was found with that username."
      );

      setSaving(false);
      return;
    }

    if (foundPlayer.id === user.id) {
      setError(
        "You are already the squad captain."
      );

      setSaving(false);
      return;
    }

    const alreadyInSquad = players.some(
      (player) =>
        player.user_id === foundPlayer.id
    );

    if (alreadyInSquad) {
      setError(
        "This player is already in your squad."
      );

      setSaving(false);
      return;
    }

    const {
      error: insertError,
    } = await supabase
      .from("squad_players")
      .insert({
        squad_id: squad.id,
        user_id: foundPlayer.id,
        player_name: foundPlayer.username,
        game_id: foundPlayer.game_id,
        player_slot: selectedSlot,
        verification_status: "pending",
      });

    if (insertError) {
      console.error(
        "Player insert error:",
        insertError
      );

      if (insertError.code === "23505") {
        setError(
          "This player or player slot is already registered in the squad."
        );
      } else {
        setError(
          "Unable to add player. Please try again."
        );
      }

      setSaving(false);
      return;
    }

    setMessage(
      `${foundPlayer.username} was added to the squad successfully.`
    );

    setPlayerUsername("");

    await loadSquad();

    setSaving(false);
  }

  async function removePlayer(playerId: string) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      "Are you sure you want to remove this player?"
    );

    if (!confirmed) {
      return;
    }

    const removedPlayer = players.find(
      (player) => player.id === playerId
    );

    if (!removedPlayer) {
      setError("Player could not be found.");
      return;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("squad_players")
      .delete()
      .eq("id", playerId)
      .eq("squad_id", squadId);

    if (deleteError) {
      console.error(
        "Player delete error:",
        deleteError
      );

      setError(
        "Unable to remove player."
      );

      return;
    }

    // If the logged-in player removed themselves,
    // return to the squad create/join page.
    if (removedPlayer.user_id === currentUserId) {
      router.push(
        `/tournaments/${tournamentId}/squad`
      );

      return;
    }

    // Captain removing another player stays on this page.
    setPlayers((currentPlayers) =>
      currentPlayers.filter(
        (player) => player.id !== playerId
      )
    );

    setMessage("Player removed from squad.");
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

  if (error && !squad) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="text-5xl">⚠️</div>
          <h1 className="mt-5 text-2xl font-black">Unable to open squad</h1>
          <p className="mt-3 text-gray-500">{error}</p>
          <button
            onClick={() => router.push(`/tournaments/${tournamentId}`)}
            className="mt-6 w-full rounded-lg border border-gray-200 py-3.5 font-black transition hover:border-green-600 hover:text-green-600"
          >
            ← Back to Tournament
          </button>
        </div>
      </main>
    );
  }

  if (!tournament || !squad) {
    return null;
  }

  const squadFull = players.length >= 4;

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-black">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-gray-200 pb-6">
          <a href="/" className="text-2xl font-black no-underline text-black">
            GAME<span className="text-green-600">ARENA</span>
          </a>
          <button
            onClick={() => router.push(`/tournaments/${tournamentId}`)}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-bold transition hover:border-green-600 hover:text-green-600"
          >
            ← Tournament
          </button>
        </header>

        <section className="py-10">
          <p className="text-sm font-bold uppercase tracking-widest text-green-600">
            {tournament.game} • SQUAD
          </p>
          <h1 className="mt-3 text-4xl font-black">{squad.squad_name}</h1>

          {isCaptain && squad.join_code && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Squad Join Code</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-2xl font-black tracking-[0.25em] text-green-700">{squad.join_code}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(squad.join_code)}
                  className="rounded-lg border border-green-200 px-3 py-2 text-sm font-bold text-green-700 transition hover:bg-green-50"
                >
                  Copy
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">Share this code with players who want to join your squad.</p>
            </div>
          )}

          {squad.is_winner && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-700">
              🏆 TOURNAMENT WINNER
            </div>
          )}

          <p className="mt-3 text-gray-600">Manage your squad and register all 4 players.</p>
        </section>

        {message && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center font-bold text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-green-600">Squad Registration</p>
              <h2 className="mt-2 text-2xl font-black">{players.length} / 4 Players</h2>
            </div>
            <div className="text-4xl">{squadFull ? "✅" : "🎮"}</div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${(players.length / 4) * 100}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-gray-500">
            {squadFull
              ? "Your squad is complete."
              : `Add ${4 - players.length} more player${4 - players.length === 1 ? "" : "s"}.`}
          </p>
        </section>

        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-black">Squad Players</h2>

          <div className="mt-5 space-y-3">
            {[1, 2, 3, 4].map((slot) => {
              const player = players.find(
                (item) => item.player_slot === slot
              );

              return (
                <div key={slot} className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 font-black text-white">{slot}</div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Player {slot}</p>
                        {player ? (
                          <>
                            <div className="flex items-center gap-3">
                              <p className="mt-1 font-black text-black">{player.player_name}</p>
                              {player.user_id === squad.captain_id && (
                                <span className="rounded-lg bg-yellow-50 px-2.5 py-1 text-xs font-black text-yellow-700">👑 Captain</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm text-gray-500">BGMI ID: {player.game_id}</p>
                              {player.verification_status === "approved" && (
                                <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">✓ Verified</span>
                              )}
                              {player.verification_status === "rejected" && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">✕ Rejected</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="mt-1 text-gray-500">Empty slot</p>
                        )}
                      </div>
                    </div>

                    {player &&
                      (squad.captain_id === currentUserId || player.user_id === currentUserId) && (
                        <button
                          onClick={() => removePlayer(player.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-green-600">Match Result</p>
          <h2 className="mt-2 text-2xl font-black">Submit Match Result</h2>

          {submission && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                submission.status === "pending"
                  ? "border-yellow-200 bg-yellow-50"
                  : submission.status === "rejected"
                  ? "border-red-200 bg-red-50"
                  : submission.status === "approved"
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {submission.status === "pending" ? "⏳" : submission.status === "rejected" ? "❌" : submission.status === "approved" ? "✅" : "📋"}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Submission Status</p>
                  <p className={`mt-1 text-lg font-black ${
                    submission.status === "pending" ? "text-yellow-600" : submission.status === "rejected" ? "text-red-700" : submission.status === "approved" ? "text-green-700" : "text-black"
                  }`}>
                    {submission.status === "pending" ? "Waiting for Organizer Review" : submission.status === "rejected" ? "Rejected — Resubmission Required" : submission.status === "approved" ? "Approved" : submission.status}
                  </p>
                </div>
              </div>

              {submission.status === "rejected" && submission.organizer_note && (
                <div className="mt-4 rounded-lg border border-red-100 bg-gray-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Organizer Note</p>
                  <p className="mt-1 text-sm text-gray-600">{submission.organizer_note}</p>
                </div>
              )}
            </div>
          )}

          <p className="mt-2 text-sm text-gray-500">After the match, enter the kills for each squad player and upload the final result screenshot.</p>

          <div className="mt-6 space-y-4">
            {players.map((player) => (
              <div key={player.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-black">{player.player_name}</p>
                      {player.user_id === squad.captain_id && (
                        <span className="inline-flex rounded-lg bg-yellow-50 px-2.5 py-1 text-xs font-black text-yellow-700">👑 Captain</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">BGMI ID: {player.game_id}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={playerKills[player.id] ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setPlayerKills((currentKills) => ({ ...currentKills, [player.id]: value }));
                    }}
                    placeholder="Kills"
                    className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm font-bold text-black outline-none focus:border-green-600"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-bold">Final Result Screenshot</p>
            <p className="mt-1 text-xs text-gray-500">Upload the screenshot showing the final match result.</p>
            <label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-green-300 bg-green-50 p-5 text-center text-sm font-bold text-green-700 transition hover:bg-green-50">
              Upload Result Screenshot
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) return;
                  if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
                  if (file.size > 10 * 1024 * 1024) { setError("Result screenshot must be 10MB or smaller."); return; }
                  setResultScreenshot(file);
                  setError("");
                  setMessage("Result screenshot selected.");
                }}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={
              submittingResult ||
              submission?.status === "pending" ||
              submission?.status === "approved"
            }
            onClick={async () => {
              if (submittingResult) return;
              if (players.length === 0) { setError("Your squad has no registered players."); return; }
              if (!resultScreenshot) { setError("Please upload the final result screenshot."); return; }

              setSubmittingResult(true);
              setError("");
              setMessage("");

              try {
                const {
                  data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                  setError("You must be logged in to submit the match result.");
                  setSubmittingResult(false);
                  return;
                }

                if (user.id !== squad.captain_id) {
                  setError("Only the squad captain can submit the match result.");
                  setSubmittingResult(false);
                  return;
                }

                const fileExtension = resultScreenshot.name.split(".").pop()?.toLowerCase() || "jpg";
                const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(fileExtension) ? fileExtension : "jpg";
                const filePath = `match-results/${tournamentId}/${squad.id}/${crypto.randomUUID()}.${safeExtension}`;

                const { error: uploadError } = await supabase.storage.from("bgmi-evidence").upload(filePath, resultScreenshot, { cacheControl: "3600", upsert: false });

                if (uploadError) {
                  console.error("Result screenshot upload error:", uploadError);
                  setError(`Unable to upload result screenshot: ${uploadError.message}`);
                  setSubmittingResult(false);
                  return;
                }

                const totalKills = players.reduce((total, player) => total + (playerKills[player.id] ?? 0), 0);

                /* RESUBMISSION AFTER REJECTION */
                if (submission?.status === "rejected") {
                  const {
                    error: updateSubmissionError,
                  } = await supabase
                    .from("squad_match_submissions")
                    .update({
                      submitted_by: user.id,
                      total_kills: totalKills,
                      result_screenshot_url: filePath,
                      status: "pending",
                      organizer_note: null,
                      reviewed_by: null,
                      reviewed_at: null,
                    })
                    .eq("id", submission.id);

                  if (updateSubmissionError) {
                    console.error("Match submission resubmission error:", updateSubmissionError);
                    await supabase.storage.from("bgmi-evidence").remove([filePath]);
                    setError(`Unable to resubmit match result: ${updateSubmissionError.message}`);
                    setSubmittingResult(false);
                    return;
                  }

                  const { error: deletePlayerResultsError } = await supabase
                    .from("squad_player_match_results")
                    .delete()
                    .eq("submission_id", submission.id);

                  if (deletePlayerResultsError) {
                    console.error("Old player results delete error:", deletePlayerResultsError);
                    setError(`Unable to replace old player kills: ${deletePlayerResultsError.message}`);
                    setSubmittingResult(false);
                    return;
                  }

                  const playerResults = players.map((player) => ({ submission_id: submission.id, squad_player_id: player.id, kills: playerKills[player.id] ?? 0 }));

                  const { error: playerResultsError } = await supabase
                    .from("squad_player_match_results")
                    .insert(playerResults);

                  if (playerResultsError) {
                    console.error("New player results error:", playerResultsError);
                    setError(`Unable to save new player kills: ${playerResultsError.message}`);
                    setSubmittingResult(false);
                    return;
                  }

                  const updatedSubmission = { ...submission, submitted_by: user.id, total_kills: totalKills, result_screenshot_url: filePath, status: "pending", organizer_note: null, reviewed_by: null, reviewed_at: null };
                  setSubmission(updatedSubmission);
                  setMessage("Match result resubmitted successfully. Waiting for organizer review.");
                  setResultScreenshot(null);
                  setPlayerKills({});
                  setSubmittingResult(false);
                  return;
                }

                /* FIRST SUBMISSION */
                const {
                  data: newSubmission,
                  error: submissionError,
                } = await supabase
                  .from("squad_match_submissions")
                  .insert({
                    tournament_id: tournamentId,
                    squad_id: squad.id,
                    submitted_by: user.id,
                    total_kills: totalKills,
                    result_screenshot_url: filePath,
                    status: "pending",
                  })
                  .select("id, tournament_id, squad_id, submitted_by, total_kills, result_screenshot_url, status, organizer_note, reviewed_by, reviewed_at, created_at")
                  .single();

                if (submissionError || !newSubmission) {
                  console.error("Match submission error:", submissionError);
                  await supabase.storage.from("bgmi-evidence").remove([filePath]);
                  setError(`Unable to submit match result: ${submissionError?.message || "Unknown error"}`);
                  setSubmittingResult(false);
                  return;
                }

                const playerResults = players.map((player) => ({ submission_id: newSubmission.id, squad_player_id: player.id, kills: playerKills[player.id] ?? 0 }));

                const { error: playerResultsError } = await supabase.from("squad_player_match_results").insert(playerResults);

                if (playerResultsError) {
                  console.error("Player match results error:", playerResultsError);
                  await supabase.from("squad_match_submissions").delete().eq("id", newSubmission.id);
                  await supabase.storage.from("bgmi-evidence").remove([filePath]);
                  setError(`Unable to save player kills: ${playerResultsError.message}`);
                  setSubmittingResult(false);
                  return;
                }

                setSubmission(newSubmission);
                setMessage("Match result submitted successfully. Waiting for organizer review.");
                setResultScreenshot(null);
                setPlayerKills({});
              } catch (submitException) {
                console.error("Unexpected match result submission error:", submitException);
                setError("Something went wrong while submitting the match result.");
              }

              setSubmittingResult(false);
            }}
            className="mt-6 w-full rounded-lg bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submittingResult
              ? "Submitting..."
              : submission?.status === "pending"
              ? "Waiting for Review..."
              : submission?.status === "approved"
              ? "Result Approved"
              : submission?.status === "rejected"
              ? "Resubmit Match Result"
              : "Submit Match Result"}
          </button>
        </section>

        {isCaptain && !squadFull && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-bold uppercase tracking-widest text-green-600">Add Player</p>
            <h2 className="mt-2 text-2xl font-black">Register a Squad Member</h2>
            <p className="mt-2 text-sm text-gray-500">Enter the player's GameArena username to register them to your squad.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-gray-700">Player Slot</label>
                <select
                  value={selectedSlot}
                  onChange={(event) => setSelectedSlot(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-black outline-none focus:border-green-600"
                >
                  {[1, 2, 3, 4]
                    .filter((slot) => !players.some((player) => player.player_slot === slot))
                    .map((slot) => (
                      <option key={slot} value={slot}>Player {slot}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">GameArena Username</label>
                <input
                  type="text"
                  value={playerUsername}
                  onChange={(event) => setPlayerUsername(event.target.value)}
                  placeholder="Teammate username"
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
                />
              </div>
            </div>
            <button
              onClick={addPlayer}
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-green-600 py-4 font-black text-white transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Adding Player..." : "Add Player"}
            </button>
          </section>
        )}

        {squadFull && (
          <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">
            <div className="text-4xl">🎯</div>
            <h2 className="mt-3 text-2xl font-black">Squad Complete</h2>
            <p className="mt-2 text-gray-600">All 4 players have been added. Your squad is ready to compete.</p>
            <div className="mt-5 rounded-lg bg-gray-50 p-4 text-sm font-bold text-green-700">Squad roster is confirmed.</div>
          </section>
        )}
      </div>
    </main>
  );
}
