export default function Loading() {
  return (
    <main
      className="site-route-loading"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="route-loading-shell" aria-hidden="true">
        <div className="route-loading-copy">
          <span className="route-skeleton-line route-skeleton-small route-shimmer" />
          <span className="route-skeleton-line route-skeleton-title route-shimmer" />
          <span className="route-skeleton-line route-skeleton-body route-shimmer" />
          <span className="route-skeleton-line route-skeleton-body route-shimmer" />
        </div>

        <div className="route-loading-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="route-loading-card" key={index}>
              <div className="route-loading-image route-shimmer" />
              <span className="route-skeleton-line route-card-line route-shimmer" />
              <span className="route-skeleton-line route-card-line-short route-shimmer" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">
        Loading Amna&apos;s Edit...
      </span>
    </main>
  );
}
