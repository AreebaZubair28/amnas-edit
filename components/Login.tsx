"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LockKeyhole } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    setError("");
    setBusy(true);

    const client = supabase();

    const {
      data: authData,
      error: authError,
    } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(
        authError?.message ||
          "Unable to sign in. Please try again."
      );
      setBusy(false);
      return;
    }

    const {
      data: isOwner,
      error: ownerError,
    } = await client.rpc("is_owner");

    if (
      ownerError ||
      isOwner !== true
    ) {
      await client.auth.signOut();
      setError(
        "This account is not authorized for owner access."
      );
      setBusy(false);
      return;
    }

    router.replace("/admin");
    setBusy(false);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <a href="/" className="logo">
          Amna&apos;s <span>Edit</span>
        </a>

        <div className="auth-icon">
          <LockKeyhole size={22} />
        </div>

        <p className="kicker">
          OWNER ACCESS
        </p>

        <h1>
          Welcome back.
        </h1>

        <p className="auth-sub">
          Sign in to manage your collection.
        </p>

        <form onSubmit={submit}>
          <label>
            Email

            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </label>

          <label>
            Password

            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </label>

          {error && (
            <div
              className="error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="button primary full"
            disabled={busy}
            aria-busy={busy}
          >
            {busy
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        <a
          href="/"
          className="back-link"
        >
          ← Back to catalogue
        </a>
      </div>
    </main>
  );
}
