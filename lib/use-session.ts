// lib/use-session.ts — subscribe to the localStorage session (client-only)
"use client";

import { useMemo, useSyncExternalStore } from 'react';
import { getSession, getToken, type Session } from './session';

function subscribe(onChange: () => void) {
  // fires when another tab logs in/out
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/**
 * `undefined` while rendering on the server / hydrating,
 * `null` when signed out (or the token expired), otherwise the decoded session.
 */
export function useSession(): Session | null | undefined {
  const token = useSyncExternalStore(subscribe, () => getToken() ?? '', () => null);
  return useMemo(() => (token === null ? undefined : token ? getSession() : null), [token]);
}
