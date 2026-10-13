import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-state-page">
      <section
        className="site-state-card"
        aria-labelledby="not-found-title"
      >
        <p className="site-state-eyebrow">
          404 · AMNA&apos;S EDIT
        </p>

        <h1 id="not-found-title">
          This page isn&apos;t in the edit.
        </h1>

        <p>
          The page or product may have moved, been removed, or the link may be incorrect.
        </p>

        <div className="site-state-actions">
          <Link
            href="/collection"
            className="button primary"
          >
            Browse collection
          </Link>

          <Link
            href="/"
            className="button secondary"
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
