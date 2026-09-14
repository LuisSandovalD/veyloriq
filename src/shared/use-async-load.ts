"use client";

import { useEffect, useEffectEvent } from "react";

/**
 * Runs an asynchronous refresh after commit while always calling the latest
 * callback. This keeps request-driven state updates out of the synchronous
 * effect body and ignores a refresh queued for an unmounted component.
 */
export function useAsyncLoad(
  callback: () => Promise<void>,
  dependency?: unknown,
): void {
  const onLoad = useEffectEvent(callback);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void onLoad();
    });
    return () => {
      active = false;
    };
  }, [dependency]);
}
