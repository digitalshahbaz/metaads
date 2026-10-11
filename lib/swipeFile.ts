"use client";

import { useCallback, useEffect, useState } from "react";
import type { Ad } from "./types";

const KEY = "metaads.swipefile.v1";

export interface SavedAd extends Ad {
  savedAt: string;
  note: string;
}

function read(): SavedAd[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedAd[];
  } catch {
    return [];
  }
}

function write(ads: SavedAd[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ads));
    window.dispatchEvent(new Event(KEY));
  } catch {
    // Storage full or blocked — the swipe file just won't persist.
  }
}

/** Swipe file kept in the browser's localStorage. */
export function useSwipeFile() {
  const [saved, setSaved] = useState<SavedAd[]>([]);

  useEffect(() => {
    const sync = () => setSaved(read());
    sync();
    window.addEventListener(KEY, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(KEY, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isSaved = useCallback((id: string) => saved.some((a) => a.id === id), [saved]);

  const toggle = useCallback((ad: Ad) => {
    const current = read();
    write(
      current.some((a) => a.id === ad.id)
        ? current.filter((a) => a.id !== ad.id)
        : [{ ...ad, savedAt: new Date().toISOString(), note: "" }, ...current],
    );
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    write(read().map((a) => (a.id === id ? { ...a, note } : a)));
  }, []);

  return { saved, isSaved, toggle, setNote };
}
