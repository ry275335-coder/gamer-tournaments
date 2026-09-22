"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCollegeLeaderboard } from "@/lib/supabase";

type CollegeEntry = {
  id: string;
  college_name: string;
  points: number;
  tournaments_count?: number;
};

export default function LeaderboardPage() {
  const [colleges, setColleges] = useState<CollegeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        // Try fetching from college_leaderboard table
        const data = await getCollegeLeaderboard();
        if (data && data.length > 0) {
          setColleges(data as CollegeEntry[]);
          setLoading(false);
          return;
        }

        // Fallback: dynamically aggregate from organizers & tournaments
        const { data: orgData } = await supabase
          .from("organizers")
          .select("id, organizer_name, institution_name");

        if (orgData && orgData.length > 0) {
          const collegeMap: Record<string, { college_name: string; points: number; tournaments_count: number }> = {};

          for (const org of orgData) {
            const name = org.institution_name || org.organizer_name || "Campus Club";
            if (!collegeMap[name]) {
              collegeMap[name] = { college_name: name, points: 100, tournaments_count: 0 };
            }

            const { count } = await supabase
              .from("tournaments")
              .select("*", { count: "exact", head: true })
              .eq("organizer_id", org.id);

            collegeMap[name].tournaments_count += count || 0;
            collegeMap[name].points += (count || 0) * 150;
          }

          const aggregated = Object.entries(collegeMap)
            .map(([k, v], idx) => ({
              id: `college-${idx}`,
              college_name: v.college_name,
              points: v.points,
              tournaments_count: v.tournaments_count,
            }))
            .sort((a, b) => b.points - a.points);

          setColleges(aggregated);
        } else {
          // Default sample standings for initial display
          setColleges([
            { id: "1", college_name: "IIT Delhi Esports Club", points: 1450, tournaments_count: 8 },
            { id: "2", college_name: "BITS Pilani Gaming Society", points: 1200, tournaments_count: 6 },
            { id: "3", college_name: "Delhi University Gamers", points: 950, tournaments_count: 5 },
            { id: "4", college_name: "VIT Chennai Esports", points: 700, tournaments_count: 4 },
            { id: "5", college_name: "DTU Gaming Arena", points: 550, tournaments_count: 3 },
          ]);
        }
      } catch (err) {
        console.error("Leaderboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-black">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 pb-4">
          <Link href="/" className="text-xl font-bold text-black no-underline">
            GAME<span className="text-green-600">ARENA</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/tournaments"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 no-underline transition hover:border-green-600 hover:text-green-600"
            >
              Tournaments
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-green-500"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {/* Title */}
        <section className="py-8 text-center">
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
            🏆 Collegiate Esports Rankings
          </span>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">College Leaderboard</h1>
          <p className="mt-2 text-gray-600">
            Track top-performing colleges, tournament hosts, and competitive gaming standings.
          </p>
        </section>

        {/* Top 3 Podium */}
        {!loading && colleges.length >= 3 && (
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            {/* 2nd Place */}
            <div className="order-2 flex flex-col items-center justify-end rounded-xl border border-gray-200 bg-gray-50/50 p-6 sm:order-1">
              <div className="text-4xl">🥈</div>
              <span className="mt-2 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-bold text-gray-700">
                2nd Place
              </span>
              <h3 className="mt-3 text-center font-bold text-gray-900">{colleges[1]?.college_name}</h3>
              <p className="mt-1 text-2xl font-extrabold text-gray-800">{colleges[1]?.points} pts</p>
              {colleges[1]?.tournaments_count !== undefined && (
                <p className="mt-1 text-xs text-gray-500">{colleges[1].tournaments_count} tournaments hosted</p>
              )}
            </div>

            {/* 1st Place */}
            <div className="order-1 flex flex-col items-center justify-end rounded-xl border-2 border-yellow-400 bg-yellow-50/40 p-6 sm:order-2 shadow-sm">
              <div className="text-5xl">👑</div>
              <span className="mt-2 rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-black">
                1st Champion
              </span>
              <h3 className="mt-3 text-center text-lg font-bold text-gray-900">{colleges[0]?.college_name}</h3>
              <p className="mt-1 text-3xl font-black text-green-600">{colleges[0]?.points} pts</p>
              {colleges[0]?.tournaments_count !== undefined && (
                <p className="mt-1 text-xs text-gray-600 font-medium">{colleges[0].tournaments_count} tournaments hosted</p>
              )}
            </div>

            {/* 3rd Place */}
            <div className="order-3 flex flex-col items-center justify-end rounded-xl border border-gray-200 bg-gray-50/50 p-6">
              <div className="text-4xl">🥉</div>
              <span className="mt-2 rounded-full bg-orange-200 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                3rd Place
              </span>
              <h3 className="mt-3 text-center font-bold text-gray-900">{colleges[2]?.college_name}</h3>
              <p className="mt-1 text-2xl font-extrabold text-gray-800">{colleges[2]?.points} pts</p>
              {colleges[2]?.tournaments_count !== undefined && (
                <p className="mt-1 text-xs text-gray-500">{colleges[2].tournaments_count} tournaments hosted</p>
              )}
            </div>
          </div>
        )}

        {/* Full Standings Table */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-base font-bold text-gray-900">All College Standings</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading standings...</div>
          ) : colleges.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No college data available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">College / Institution</th>
                    <th className="px-6 py-3 text-center">Tournaments Hosted</th>
                    <th className="px-6 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {colleges.map((college, idx) => (
                    <tr key={college.id || idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-bold">
                        {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : `#${idx + 1}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{college.college_name}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 font-medium">
                        {college.tournaments_count ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-green-600">
                        {college.points} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/tournaments" className="text-sm font-medium text-green-600 hover:underline">
            ← Browse Active College Tournaments
          </Link>
        </div>
      </div>
    </main>
  );
}
