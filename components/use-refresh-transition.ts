"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Run a server action, then refresh server data so lists/badges update instantly.
 * The refresh is deliberately *outside* any async transition: a router.refresh() issued
 * after an await inside startTransition gets dropped.
 */
export function useRefreshTransition(): [boolean, (fn: () => unknown) => void] {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const start = (fn: () => unknown) => {
    setPending(true);
    Promise.resolve()
      .then(fn)
      .catch((e) => console.error(e))
      .finally(() => {
        setPending(false);
        router.refresh();
      });
  };
  return [pending, start];
}
