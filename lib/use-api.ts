// lib/use-api.ts — load data from the API with loading / error / reload state
"use client";

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';

interface State<T> {
  /** request the current data/error belong to (path + reload counter) */
  key: string | null;
  path: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Fetch `path` on mount and whenever it changes. Pass null to skip.
 * `loading` is true until the first response for this path; `refreshing` during reload().
 */
export function useApi<T>(path: string | null, opts: { auth?: boolean } = {}) {
  const auth = opts.auth ?? true;
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State<T>>({ key: null, path: null, data: null, error: null });
  const key = path ? `${path}#${nonce}` : null;

  useEffect(() => {
    if (!path || !key) return;
    const ctrl = new AbortController();
    api<T>(path, { auth, signal: ctrl.signal })
      .then(data => setState({ key, path, data, error: null }))
      .catch(err => {
        if ((err as Error).name === 'AbortError') return;
        setState(s => ({ key, path, data: s.path === path ? s.data : null, error: errorMessage(err) }));
      });
    return () => ctrl.abort();
  }, [path, key, auth]);

  const reload = useCallback(() => setNonce(n => n + 1), []);
  const setData = useCallback(
    (update: T | ((prev: T | null) => T)) =>
      setState(s => ({ ...s, data: typeof update === 'function' ? (update as (p: T | null) => T)(s.data) : update })),
    [],
  );

  const settled = state.key === key;
  const samePath = state.path === path;
  return {
    data: samePath ? state.data : null,
    error: samePath ? state.error : null,
    loading: !!path && !samePath,
    refreshing: !!path && samePath && !settled,
    reload,
    setData,
  };
}
