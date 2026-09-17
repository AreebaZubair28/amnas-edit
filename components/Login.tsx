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

    const { error } =
      await supabase().auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError(error.message);
    } else {
      /*
       * Mark this browser tab as having completed
       * the owner login. sessionStorage is cleared
       * when the tab/window is closed, which means
       * opening the site again requires login.
       *
       * A normal page refresh keeps the marker,
       * so refreshing /admin does not log the owner out.
       */
      sessionStorage.setItem(
        "amnas-edit-owner-session",
        "authenticated"
      );

      router.push("/admin");
    }

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
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </label>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            className="button primary full"
            disabled={busy}
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
