"use client";

import Link from "next/link";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Amna's Edit route error:", error);
  }, [error]);

  return (
    <main className="site-state-page">
      <section
        className="site-state-card"
        role="alert"
        aria-labelledby="site-error-title"
      >
        <p className="site-state-eyebrow">
          AMNA&apos;S EDIT
        </p>

        <h1 id="site-error-title">
          Something went wrong.
        </h1>

        <p>
          We couldn&apos;t load this page right now. You can try again, or return to the collection.
        </p>

        <div className="site-state-actions">
          <button
            type="button"
            className="button primary"
            onClick={reset}
          >
            Try again
          </button>

          <Link
            href="/collection"
            className="button secondary"
          >
            View collection
          </Link>
        </div>
      </section>
    </main>
  );
}
