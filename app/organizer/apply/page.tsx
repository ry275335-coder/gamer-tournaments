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
  const [institutionName, setInstitutionName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? "");

        let { data: organizer, error: orgErr } = await supabase
          .from("organizers")
          .select("id, is_verified")
          .eq("user_id", user.id)
          .maybeSingle();

        if (orgErr && orgErr.message?.includes("does not exist")) {
          const fallback = await supabase
            .from("organizers")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          organizer = fallback.data ? { ...fallback.data, is_verified: true } : null;
        }

        if (organizer) {
          if (organizer.is_verified) {
            router.replace("/organizer");
          } else {
            setVerificationPending(true);
          }
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

    if (!institutionName.trim()) {
      setError("Please enter your institution/college name.");
      return;
    }

    if (!logoUrl.trim()) {
      setError("Please provide a URL to your college logo.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        // User already signed in, create verification request
        const { error: verificationError } = await supabase
          .from("college_verifications")
          .insert({
            user_id: currentUser.id,
            college_name: institutionName,
            student_id_image_url: logoUrl,
            status: "pending",
          });

        if (verificationError) {
          console.error("Verification error:", verificationError);
          setError("Unable to submit verification request. Please try again.");
          setLoading(false);
          return;
        }

        setSuccess(
          "Verification request submitted! Please wait for approval from admin."
        );
        setLoading(false);
        setVerificationPending(true);
        return;
      }

      // No user, need to sign up first
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
        setError("Unable to create account.");
        setLoading(false);
        return;
      }

      // Create verification request for the new user
      const { error: verificationError } = await supabase
        .from("college_verifications")
        .insert({
          user_id: signUpData.user.id,
          college_name: institutionName,
          student_id_image_url: logoUrl,
          status: "pending",
        });

      if (verificationError) {
        console.error("Verification error:", verificationError);
        // Clean up: delete the user we just created? For simplicity, we'll just show error.
        setError("Unable to submit verification request. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(
        "Verification request submitted! Please wait for approval from admin."
      );
      setLoading(false);
      setVerificationPending(true);

      // Sign out the user until they are approved
      await supabase.auth.signOut();
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

  if (verificationPending) {
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-black">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <Link href="/" className="text-3xl font-black text-black no-underline">
              Game<span className="text-green-600">Arena</span>
            </Link>

            <h1 className="mt-8 text-3xl font-bold">Application Submitted</h1>
            <p className="mt-2 text-sm text-gray-600">
              Your verification request has been submitted and is pending review.
              You will be notified once approved.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-green-600 no-underline">
              ← Back to GameArena
            </Link>
          </div>
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

          {success && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name (optional)"
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
              <p className="mt-2 text-xs text-gray-500">
                This email will be used for organizer login.
              </p>
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
              <p className="mt-2 text-xs text-gray-500">
                Phone login can be added later.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">5. Institution / College Name</label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Enter your college or institution name"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">6. College Logo URL</label>
              <input
                type="text"
                required
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Paste a URL to your college logo image"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
              <p className="mt-2 text-xs text-gray-500">
                This logo will be displayed on your tournament pages.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">7. Reason</label>
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
              <label className="mb-2 block text-sm font-medium text-gray-700">8. Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-black outline-none placeholder:text-gray-400 focus:border-green-600"
              />
              <p className="mt-2 text-xs text-gray-500">
                Password must be at least 6 characters.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">9. Confirm Password</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-3.5 font-bold text-white transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting Application..." : "Submit Application"}
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
          <Link href="/" className="text-sm text-gray-600 hover:text-green-600 no-underline">
            ← Back to GameArena
          </Link>
        </div>
      </div>
    </main>
  );
}