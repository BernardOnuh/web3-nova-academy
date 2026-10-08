// lib/use-countdown.ts — live countdown to a timestamp
"use client";

import { useEffect, useState } from 'react';

export interface Countdown {
  done: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  /** "23h 04m" / "4m 09s" */
  label: string;
}

function compute(target: number, now: number): Countdown {
  const ms = Math.max(0, target - now);
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    done: ms === 0,
    hours,
    minutes,
    seconds,
    label: hours ? `${hours}h ${pad(minutes)}m` : `${minutes}m ${pad(seconds)}s`,
  };
}

export function useCountdown(target: string | Date | null | undefined): Countdown | null {
  const [now, setNow] = useState(() => Date.now());
  const t = target ? new Date(target).getTime() : null;

  useEffect(() => {
    if (t === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [t]);

  return t === null ? null : compute(t, now);
}
