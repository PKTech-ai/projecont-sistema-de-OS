"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface TVRefresherProps {
  intervalMs?: number;
}

export function TVRefresher({ intervalMs = 30000 }: TVRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}
