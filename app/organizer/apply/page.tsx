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
      /*
       * Check whether the visitor is already logged in.
       */
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      /*
       * Existing logged-in player becomes organizer.
       */
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

      /*
       * New organizer account.
       */
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

      /*
       * Create organizer profile.
       */
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

      /*
       * Sign out so the user must explicitly
       * login through Organizer Login.
       */
      await supabase.auth.signOut();

      setSuccess(
        "Organizer account created successfully! Redirecting to Organizer Login..."
      );

      setLoading(false);

      /*
       * Redirect to Organizer Login.
       */
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl">

        {/* Logo */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-3xl font-black tracking-tight"
          >
            Game<span className="text-cyan-400">Arena</span>
          </Link>

          <h1 className="mt-8 text-3xl font-bold">
            Become an Organizer
          </h1>

          <p className="mt-2 text-slate-400">
            Create your organizer account and start hosting tournaments.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Organizer Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                1. Organizer Name
              </label>

              <input
                type="text"
                required
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="Enter organizer name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {/* Organization Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                2. Organization Name
              </label>

              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                3. Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizer@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                This email will be used for organizer login.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                4. Phone
              </label>

              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                Phone login can be added later.
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                5. Reason
              </label>

              <textarea
                required
                value={applicationReason}
                onChange={(e) => setApplicationReason(e.target.value)}
                placeholder="Why do you want to become an organizer?"
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                6. Password
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                Password must be at least 6 characters.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                7. Confirm Password
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            {/* Success Message */}
            {success && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-300">
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating Organizer Account..."
                : "Create Organizer Account"}
            </button>
          </form>

          {/* Login */}
          <div className="mt-6 border-t border-slate-800 pt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an organizer account?
            </p>

            <Link
              href="/organizer/login"
              className="mt-2 inline-block font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Organizer Login
            </Link>
          </div>
        </div>

        {/* Back */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            ← Back to GameArena
          </Link>
        </div>
      </div>
    </main>
  );
}