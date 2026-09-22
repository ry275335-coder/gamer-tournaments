"use client";
import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  title: string;
  game: string;
  format: "solo" | "squad";
  max_players: number;
  start_time: string;
  end_time: string;
  status: string;
};

type Squad = {
  id: string;
  tournament_id: string;
  squad_name: string;
  captain_id: string;
  status: string;
  created_at: string;
  is_winner: boolean;
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

function OrganizerSquadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedTournamentId =
    searchParams.get("tournament");

  const [loading, setLoading] = useState(true);

  const [organizerId, setOrganizerId] =
    useState<string | null>(null);

  const [tournaments, setTournaments] =
    useState<Tournament[]>([]);

  const [selectedTournamentId, setSelectedTournamentId] =
    useState("");

  const [squads, setSquads] =
    useState<Squad[]>([]);

  const [selectedSquad, setSelectedSquad] =
    useState<Squad | null>(null);

  const [players, setPlayers] =
    useState<SquadPlayer[]>([]);

  const [loadingSquads, setLoadingSquads] =
    useState(false);

  const [loadingPlayers, setLoadingPlayers] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [reviewingPlayerId, setReviewingPlayerId] =
    useState<string | null>(null);

  const [signedUrls, setSignedUrls] =
    useState<Record<string, string>>({});

  const [matchSubmission, setMatchSubmission] =
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

  const [matchPlayerResults, setMatchPlayerResults] =
    useState<
      {
        id: string;
        submission_id: string;
        squad_player_id: string;
        kills: number;
      }[]
    >([]);

  const [matchResultSignedUrl, setMatchResultSignedUrl] =
    useState<string | null>(null);

  const [reviewingMatchResult, setReviewingMatchResult] =
    useState(false);
    const [organizerNote, setOrganizerNote] =
  useState("");

  useEffect(() => {
    loadOrganizer();
  }, []);

  async function loadOrganizer() {
    setLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/organizer/login");
      return;
    }

    const {
      data: organizer,
      error: organizerError,
    } = await supabase
      .from("organizers")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (organizerError || !organizer) {
      console.error(
        "Organizer loading error:",
        organizerError
      );

      setError(
        "Organizer account could not be found."
      );

      setLoading(false);
      return;
    }

    setOrganizerId(organizer.id);

    const {
      data: tournamentData,
      error: tournamentError,
    } = await supabase
      .from("tournaments")
      .select(
        "id, title, game, format, max_players, start_time, end_time, status"
      )
      .eq("organizer_id", organizer.id)
      .eq("format", "squad")
      .order("start_time", {
        ascending: true,
      });

    if (tournamentError) {
      console.error(
        "Tournament loading error:",
        tournamentError
      );

      setError(
        "Unable to load your squad tournaments."
      );

      setLoading(false);
      return;
    }

    setTournaments(tournamentData || []);

    if (
      tournamentData &&
      tournamentData.length > 0
    ) {
      const requestedTournament =
        tournamentData.find(
          (tournament) =>
            tournament.id ===
            requestedTournamentId
        );

      const tournamentToOpen =
        requestedTournament ||
        tournamentData[0];

      setSelectedTournamentId(
        tournamentToOpen.id
      );

      await loadSquads(
        tournamentToOpen.id
      );
    }

    setLoading(false);
  }

  async function loadSquads(tournamentId: string) {
    setLoadingSquads(true);
    setError("");
    setMessage("");
    setSelectedSquad(null);
    setPlayers([]);
    setSignedUrls({});

    const {
      data,
      error: squadError,
    } = await supabase
      .from("tournament_squads")
      .select(
        "id, tournament_id, squad_name, captain_id, status, created_at, is_winner"
      )
      .eq("tournament_id", tournamentId)
      .order("created_at", {
        ascending: true,
      });

    if (squadError) {
      console.error(
        "Squad loading error:",
        squadError
      );

      setError(
        "Unable to load squads."
      );

      setLoadingSquads(false);
      return;
    }

    setSquads(data || []);
    setLoadingSquads(false);
  }

  async function handleTournamentChange(
    tournamentId: string
  ) {
    setSelectedTournamentId(tournamentId);

    if (!tournamentId) {
      setSquads([]);
      setSelectedSquad(null);
      setPlayers([]);
      return;
    }

    await loadSquads(tournamentId);
  }

  async function openSquad(squad: Squad) {
    setSelectedSquad(squad);
    setLoadingPlayers(true);
    setError("");
    setMessage("");
    setSignedUrls({});
    setMatchSubmission(null);
    setMatchPlayerResults([]);
    setMatchResultSignedUrl(null);

    const {
      data,
      error: playerError,
    } = await supabase
      .from("squad_players")
      .select(
        "id, squad_id, user_id, player_name, game_id, player_slot, id_screenshot_url, verification_status"
      )
      .eq("squad_id", squad.id)
      .order("player_slot", {
        ascending: true,
      });

    if (playerError) {
      console.error(
        "Squad player loading error:",
        playerError
      );

      setError(
        "Unable to load squad players."
      );

      setLoadingPlayers(false);
      return;
    }

    const playerList = data || [];

    setPlayers(playerList);

    await createSignedUrls(playerList);

    const {
      data: submissionData,
      error: submissionError,
    } = await supabase
      .from("squad_match_submissions")
      .select(
        "id, tournament_id, squad_id, submitted_by, total_kills, result_screenshot_url, status, organizer_note, reviewed_by, reviewed_at, created_at"
      )
      .eq("squad_id", squad.id)
      .maybeSingle();

    if (submissionError) {
      console.error(
        "Match submission loading error:",
        submissionError
      );

      setError(
        "Unable to load squad match result."
      );

      setLoadingPlayers(false);
      return;
    }

    if (submissionData) {
      setMatchSubmission(submissionData);

      setOrganizerNote(
        submissionData.organizer_note || ""
      );

      const {
        data: playerResultData,
        error: playerResultError,
      } = await supabase
        .from("squad_player_match_results")
        .select(
          "id, submission_id, squad_player_id, kills"
        )
        .eq(
          "submission_id",
          submissionData.id
        );

      if (playerResultError) {
        console.error(
          "Player match result loading error:",
          playerResultError
        );

        setError(
          "Unable to load player kill results."
        );

        setLoadingPlayers(false);
        return;
      }

      setMatchPlayerResults(
        playerResultData || []
      );

      if (
        submissionData.result_screenshot_url
      ) {
        const {
          data: signedResultData,
          error: signedResultError,
        } = await supabase.storage
          .from("bgmi-evidence")
          .createSignedUrl(
            submissionData.result_screenshot_url,
            600
          );

        if (signedResultError) {
          console.error(
            "Match result screenshot error:",
            signedResultError
          );
        } else {
          setMatchResultSignedUrl(
            signedResultData.signedUrl
          );
        }
      }
    }

    setLoadingPlayers(false);
  }

  async function createSignedUrls(
    playerList: SquadPlayer[]
  ) {
    const urlMap: Record<string, string> = {};

    for (const player of playerList) {
      if (!player.id_screenshot_url) {
        continue;
      }

      const {
        data,
        error: signedUrlError,
      } = await supabase.storage
        .from("bgmi-evidence")
        .createSignedUrl(
          player.id_screenshot_url,
          60 * 10
        );

      if (signedUrlError) {
        console.error(
          "Signed URL error:",
          signedUrlError
        );

        setError(
          `Screenshot access error: ${signedUrlError.message}`
        );

        continue;
      }

      if (data?.signedUrl) {
        urlMap[player.id] =
          data.signedUrl;
      }
    }

    setSignedUrls(urlMap);
  }

  async function updateVerification(
    player: SquadPlayer,
    status: "pending" | "approved" | "rejected"
  ) {
    setReviewingPlayerId(player.id);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("squad_players")
      .update({
        verification_status: status,
      })
      .eq("id", player.id);

    if (updateError) {
      console.error(
        "Verification update error:",
        updateError
      );

      setError(
        `Unable to update player verification: ${updateError.message}`
      );

      setReviewingPlayerId(null);
      return;
    }

    setPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === player.id
          ? {
              ...currentPlayer,
              verification_status: status,
            }
          : currentPlayer
      )
    );

    setMessage(
      `${player.player_name} is marked as ${status}.`
    );

    setReviewingPlayerId(null);
  }

  async function updateMatchSubmission(
    status: "approved" | "rejected"
  ) {
    if (!matchSubmission) {
      return;
    }

    setReviewingMatchResult(true);
    setError("");
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Your organizer session has expired."
      );

      setReviewingMatchResult(false);
      return;
    }

    const { data, error: updateError } =
      await supabase
        .from("squad_match_submissions")
        .update({
          status,
          organizer_note:
            organizerNote.trim() || null,
          reviewed_by: user.id,
          reviewed_at:
            new Date().toISOString(),
        })
        .eq("id", matchSubmission.id)
        .select(
          "id, tournament_id, squad_id, submitted_by, total_kills, result_screenshot_url, status, organizer_note, reviewed_by, reviewed_at, created_at"
        )
        .single();

    if (updateError) {
      console.error(
        "Match submission update error:",
        updateError
      );

      setError(
        `Unable to update match result: ${updateError.message}`
      );

      setReviewingMatchResult(false);
      return;
    }

    setMatchSubmission(data);
    if (status === "rejected") {
      const {
        error: removeWinnerError,
      } = await supabase
        .from("tournament_squads")
        .update({
          is_winner: false,
          winner_note: null,
          winner_declared_at: null,
          winner_declared_by: null,
        })
        .eq(
          "id",
          matchSubmission.squad_id
        )
        .eq(
          "tournament_id",
          matchSubmission.tournament_id
        );

      if (removeWinnerError) {
        console.error(
          "Remove winner after rejection error:",
          removeWinnerError
        );

        setError(
          `Match was rejected, but winner status could not be removed: ${removeWinnerError.message}`
        );

        return;
      }
    }

    setOrganizerNote(
      data.organizer_note || ""
    );

    setMessage(
      `Match result marked as ${status}.`
    );

    setReviewingMatchResult(false);
  }

  async function declareWinner(
    squad: Squad
  ) {
    setError("");
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Your organizer session has expired."
      );
      return;
    }

    const confirmed = window.confirm(
      `Declare "${squad.squad_name}" as the winner of this tournament?`
    );

    if (!confirmed) {
      return;
    }

    const { error: clearWinnerError } =
      await supabase
        .from("tournament_squads")
        .update({
          is_winner: false,
        })
        .eq(
          "tournament_id",
          squad.tournament_id
        );

    if (clearWinnerError) {
      console.error(
        "Clear previous winner error:",
        clearWinnerError
      );

      setError(
        `Unable to clear previous winner: ${clearWinnerError.message}`
      );

      return;
    }

    const { error: winnerError } =
      await supabase
        .from("tournament_squads")
        .update({
          is_winner: true,
          winner_declared_at:
            new Date().toISOString(),
          winner_declared_by: user.id,
        })
        .eq("id", squad.id);

    if (winnerError) {
      console.error(
        "Winner declaration error:",
        winnerError
      );

      setError(
        `Unable to declare winner: ${winnerError.message}`
      );

      return;
    }

    setSquads((currentSquads) =>
      currentSquads.map((currentSquad) =>
        currentSquad.id === squad.id
          ? {
              ...currentSquad,
              is_winner: true,
            }
          : currentSquad
      )
    );

    setSelectedSquad((currentSquad) =>
      currentSquad &&
      currentSquad.id === squad.id
        ? {
            ...currentSquad,
            is_winner: true,
          }
        : currentSquad
    );

    setMessage(
      `🏆 ${squad.squad_name} has been declared the winner.`
    );
  }

  function getVerificationClasses(
    status: string
  ) {
    if (status === "approved") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (status === "rejected") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-yellow-200 bg-yellow-50 text-yellow-700";
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
    <main className="min-h-screen bg-white px-6 py-8 text-black">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <button
              onClick={() => router.push("/organizer")}
              className="text-2xl font-black text-black"
            >
              GAME <span className="text-green-600">ARENA</span>
            </button>

            <p className="mt-2 text-sm text-gray-600">Organizer • Squad Verification</p>
          </div>

          <button
            onClick={() => router.push("/organizer")}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-bold transition hover:border-green-600 hover:text-green-600"
          >
            ← Organizer Dashboard
          </button>
        </header>

        <section className="py-10">
          <p className="text-sm font-bold uppercase tracking-widest text-green-600">Squad Management</p>
          <h1 className="mt-3 text-4xl font-black">Verify Squad Players</h1>
          <p className="mt-3 max-w-2xl text-gray-600">Review every squad member's GameArena information and BGMI ID screenshot before the tournament.</p>
        </section>

        {message && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center font-bold text-green-700">{message}</div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">{error}</div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-green-600">Select Tournament</p>

          {tournaments.length === 0 ? (
            <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-yellow-700">You do not have any squad tournaments yet.</div>
          ) : (
            <select
              value={selectedTournamentId}
              onChange={(event) => handleTournamentChange(event.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-4 text-black outline-none focus:border-green-600"
            >
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title} • {tournament.game}
                </option>
              ))}
            </select>
          )}
        </section>

        {tournaments.length > 0 && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-green-600">Registered Squads</p>
                <h2 className="mt-2 text-2xl font-black">{squads.length} Squad{squads.length === 1 ? "" : "s"}</h2>
              </div>

              <div className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-600">Maximum 25 squads</div>
            </div>

            {loadingSquads ? (
              <p className="mt-6 text-gray-500">Loading squads...</p>
            ) : squads.length === 0 ? (
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                <div className="text-4xl">👥</div>
                <p className="mt-3 font-bold">No squads registered yet.</p>
                <p className="mt-1 text-sm text-gray-500">Squads will appear here when players register.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {squads.map((squad) => (
                  <button
                    key={squad.id}
                    onClick={() => openSquad(squad)}
                    className={`rounded-xl border p-5 text-left transition ${
                      selectedSquad?.id === squad.id
                        ? "border-green-600 bg-green-50"
                        : "border-gray-200 bg-white hover:border-green-600/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Squad</p>
                        <h3 className="mt-1 text-xl font-black">{squad.squad_name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {squad.is_winner && (
                          <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-black text-yellow-700">🏆 WINNER</span>
                        )}
                        <div className="text-2xl">🎮</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Registered</span>
                      <span className="text-sm font-bold text-green-600">View Players →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedSquad && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-green-600">Squad Details</p>
                <h2 className="mt-2 text-3xl font-black">{selectedSquad.squad_name}</h2>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <span className="text-gray-500">Players: </span>
                <span className="font-black">{players.length} / 4</span>
              </div>
            </div>

            {loadingPlayers ? (
              <p className="mt-6 text-gray-500">Loading squad players...</p>
            ) : (
              <div className="mt-6 space-y-4">
                {[1, 2, 3, 4].map((slot) => {
                  const player = players.find(
                    (item) => item.player_slot === slot
                  );

                  if (!player) {
                    return (
                      <div key={slot} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 font-black text-gray-500">{slot}</div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Player {slot}</p>
                            <p className="mt-1 text-gray-500">Empty slot</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={player.id} className="rounded-lg border border-gray-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 font-black text-white">{player.player_slot}</div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Player {player.player_slot}</p>
                            <h3 className="mt-1 text-xl font-black">{player.player_name}</h3>
                            <p className="mt-1 text-sm text-gray-600">BGMI ID: <span className="font-bold">{player.game_id}</span></p>
                          </div>
                        </div>
                        <span className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${getVerificationClasses(player.verification_status)}`}>
                          {player.verification_status}
                        </span>
                      </div>

                      {player.id_screenshot_url && signedUrls[player.id] && (
                        <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
                          <p className="text-sm font-bold">BGMI ID Screenshot</p>
                          <div className="mt-4">
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                              <img
                                src={signedUrls[player.id]}
                                alt={`${player.player_name} BGMI ID screenshot`}
                                className="max-h-[500px] w-full object-contain"
                              />
                            </div>
                            <a href={signedUrls[player.id]} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-green-600 hover:text-green-700">Open full screenshot ↗</a>
                          </div>
                        </div>
                      )}

                      <div className="mt-5">
                        <p className="text-sm font-bold">Player Verification</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <button
                            onClick={() => updateVerification(player, "pending")}
                            disabled={reviewingPlayerId === player.id}
                            className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-black text-yellow-700 transition hover:bg-yellow-100 disabled:opacity-50"
                          >🟡 Pending</button>
                          <button
                            onClick={() => updateVerification(player, "approved")}
                            disabled={reviewingPlayerId === player.id}
                            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                          >🟢 Approve</button>
                          <button
                            onClick={() => updateVerification(player, "rejected")}
                            disabled={reviewingPlayerId === player.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >🔴 Reject</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-green-600">Match Result Review</p>
                  <h2 className="mt-2 text-2xl font-black">Squad Match Submission</h2>
                  <p className="mt-2 text-sm text-gray-500">Review the submitted kills and result screenshot before approving the result.</p>
                </div>
                {matchSubmission && (
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${
                    matchSubmission.status === "approved" ? "border-green-200 bg-green-50 text-green-700" : matchSubmission.status === "rejected" ? "border-red-200 bg-red-50 text-red-700" : "border-yellow-200 bg-yellow-50 text-yellow-700"
                  }`}>
                    {matchSubmission.status}
                  </span>
                )}
              </div>

              {!matchSubmission ? (
                <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
                  <div className="text-3xl">⏳</div>
                  <p className="mt-3 font-bold text-yellow-700">No match result submitted</p>
                  <p className="mt-1 text-sm text-gray-500">Waiting for the squad captain to submit the match result.</p>
                </div>
              ) : (
                <>
                  <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Squad Kills</p>
                    <p className="mt-2 text-4xl font-black text-green-600">{matchSubmission.total_kills}</p>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-bold">Player Kill Results</p>
                    <div className="mt-3 space-y-3">
                      {players.map((player) => {
                        const result = matchPlayerResults.find((item) => item.squad_player_id === player.id);
                        return (
                          <div key={player.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Player {player.player_slot}</p>
                              <p className="mt-1 font-black">{player.player_name}</p>
                              <p className="mt-1 text-xs text-gray-500">BGMI ID: {player.game_id}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Kills</p>
                              <p className="mt-1 text-2xl font-black text-green-600">{result?.kills ?? 0}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
                    <p className="text-sm font-bold">Final Result Screenshot</p>
                    {matchResultSignedUrl ? (
                      <div className="mt-4">
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                          <img src={matchResultSignedUrl} alt="Squad final match result screenshot" className="max-h-[600px] w-full object-contain" />
                        </div>
                        <a href={matchResultSignedUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-green-600 hover:text-green-700">Open full result screenshot ↗</a>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-5 text-center">
                        <p className="font-bold text-red-700">Unable to load result screenshot</p>
                        <p className="mt-1 text-xs text-gray-500">The screenshot may have been removed or access is unavailable.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <p className="text-sm font-bold">Organizer Note</p>
                    <textarea
                      value={organizerNote}
                      onChange={(event) => setOrganizerNote(event.target.value)}
                      placeholder="Write a note about this match result..."
                      rows={4}
                      className="mt-3 w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-gray-400 focus:border-green-600"
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => updateMatchSubmission("approved")}
                      disabled={reviewingMatchResult}
                      className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >{reviewingMatchResult ? "Saving..." : "🟢 Approve Match Result"}</button>
                    <button
                      onClick={() => updateMatchSubmission("rejected")}
                      disabled={reviewingMatchResult}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >{reviewingMatchResult ? "Saving..." : "🔴 Reject Match Result"}</button>
                    {matchSubmission.status === "approved" && (
                      <button
                        onClick={() => declareWinner(selectedSquad!)}
                        disabled={matchSubmission.status !== "approved"}
                        className="sm:col-span-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-black text-yellow-700 transition hover:bg-yellow-100 disabled:opacity-50"
                      >🏆 Declare This Squad Winner</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
export default function OrganizerSquadsPage() {
  return (
    <Suspense fallback={null}>
      <OrganizerSquadsPageContent />
    </Suspense>
  );
}
