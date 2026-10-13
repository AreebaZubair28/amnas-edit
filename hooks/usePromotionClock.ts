"use client";

import {
  useEffect,
  useState,
} from "react";

type TimedPromotion = {
  start_at: string;
  end_at: string;
  is_active: boolean;
};

/*
 * Keeps promotion timing accurate without rerendering the whole
 * storefront every second.
 *
 * Instead of a permanent interval, this hook finds the next
 * promotion start/end boundary and schedules ONE timeout for it.
 */
export function usePromotionClock(
  promotions: TimedPromotion[]
): number {
  const [now, setNow] =
    useState(() => Date.now());

  useEffect(() => {
    const currentTime =
      Date.now();

    const boundaries =
      promotions
        .filter(
          (promotion) =>
            promotion.is_active
        )
        .flatMap((promotion) => {
          const start =
            new Date(
              promotion.start_at
            ).getTime();

          const end =
            new Date(
              promotion.end_at
            ).getTime();

          const values: number[] =
            [];

          if (
            Number.isFinite(start) &&
            start > currentTime
          ) {
            values.push(start);
          }

          /*
           * isPromotionActive() uses <= end_at,
           * so update just after the end boundary.
           */
          if (
            Number.isFinite(end) &&
            end >= currentTime
          ) {
            values.push(end + 50);
          }

          return values;
        })
        .filter(
          (value) =>
            value > currentTime
        );

    if (
      boundaries.length === 0
    ) {
      return;
    }

    const nextBoundary =
      Math.min(...boundaries);

    /*
     * Browsers have a maximum practical timeout.
     * Cap the delay and re-evaluate later if a
     * promotion is scheduled far in the future.
     */
    const MAX_TIMEOUT_MS =
      2_147_000_000;

    const delay =
      Math.min(
        Math.max(
          nextBoundary -
            currentTime,
          0
        ),
        MAX_TIMEOUT_MS
      );

    const timeout =
      window.setTimeout(
        () => {
          setNow(Date.now());
        },
        delay
      );

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [promotions, now]);

  return now;
}
