"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function OrganizerApplyPage() {
  const router = useRouter();

  const [organizerName, setOrganizerName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [applicationReason, setApplicationReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? "");

        const { data: organizer } = await supabase
          .from("organizers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (organizer) {
          router.replace("/organizer");
          return;
        }
      }

      setChecking(false);
    }

    checkUser();
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        const { error: organizerError } = await supabase
          .from("organizers")
          .insert({
            user_id: currentUser.id,
            organizer_name: organizerName,
            organization_name: organizationName || null,
            email: email || currentUser.email || null,
            phone: phone || null,
            application_reason: applicationReason || null,
            status: "approved",
          });

        if (organizerError) {
          if (organizerError.code === "23505") {
            setError("You already have an organizer account.");
          } else {
            setError(organizerError.message);
          }

          setLoading(false);
          return;
        }

        setSuccess(
          "Organizer account created successfully! Redirecting to Organizer Login..."
        );

        setLoading(false);

        setTimeout(() => {
          router.replace("/organizer/login");
        }, 1500);

        return;
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!signUpData.user) {
        setError("Unable to create organizer account.");
        setLoading(false);
        return;
      }

      const { error: organizerError } = await supabase
        .from("organizers")
        .insert({
          user_id: signUpData.user.id,
          organizer_name: organizerName,
          organization_name: organizationName || null,
          email,
          phone: phone || null,
          application_reason: applicationReason || null,
          status: "approved",
        });

      if (organizerError) {
        setError(organizerError.message);
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();

      setSuccess(
        "Organizer account created successfully! Redirecting to Organizer Login..."
      );

      setLoading(false);

      setTimeout(() => {
        router.replace("/organizer/login");
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checking) {
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
    <main className="min-h-screen bg-white px-4 py-8 text-black">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-black text-black no-underline">
            Game<span className="text-green-600">Arena</span>
          </Link>

          <h1 className="mt-8 text-3xl font-bold">Become an Organizer</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your organizer account and start hosting tournaments.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">1. Organizer Name</label>
              <input
                type="text"
                required
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="Enter organizer name"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">2. Organization Name</label>
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">3. Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizer@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
              <p className="mt-2 text-xs text-gray-500">This email will be used for organizer login.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">4. Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
              <p className="mt-2 text-xs text-gray-500">Phone login can be added later.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">5. Reason</label>
              <textarea
                required
                value={applicationReason}
                onChange={(e) => setApplicationReason(e.target.value)}
                placeholder="Why do you want to become an organizer?"
                rows={5}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">6. Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
              <p className="mt-2 text-xs text-gray-500">Password must be at least 6 characters.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">7. Confirm Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-3.5 font-bold text-white transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Organizer Account..." : "Create Organizer Account"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">Already have an organizer account?</p>
            <Link href="/organizer/login" className="mt-2 inline-block font-semibold text-green-600 hover:text-green-500 no-underline">
              Organizer Login
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-green-600 no-underline">← Back to GameArena</Link>
        </div>
      </div>
    </main>
  );
}
