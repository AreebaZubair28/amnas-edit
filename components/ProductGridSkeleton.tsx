"use client";

type ProductGridSkeletonProps = {
  count?: number;
  showHeading?: boolean;
};

export default function ProductGridSkeleton({
  count = 6,
  showHeading = false,
}: ProductGridSkeletonProps) {
  return (
    <div
      className="product-skeleton-section"
      role="status"
      aria-live="polite"
      aria-label="Loading products"
    >
      {showHeading && (
        <div className="skeleton-heading" aria-hidden="true">
          <span className="skeleton-line skeleton-line-short skeleton-shimmer" />
          <span className="skeleton-line skeleton-line-title skeleton-shimmer" />
        </div>
      )}

      <div className="product-grid skeleton-grid" aria-hidden="true">
        {Array.from({ length: count }).map((_, index) => (
          <div className="product-skeleton-card" key={index}>
            <div className="skeleton-image skeleton-shimmer" />

            <div className="skeleton-card-copy">
              <span className="skeleton-line skeleton-line-brand skeleton-shimmer" />
              <span className="skeleton-line skeleton-line-name skeleton-shimmer" />
              <span className="skeleton-line skeleton-line-price skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">
        Loading Amna&apos;s Edit products...
      </span>
    </div>
  );
}
