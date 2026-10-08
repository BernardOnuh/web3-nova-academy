// lib/api.ts — single fetch wrapper for the cohort-portal API
import { clearSession, getToken } from './session';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3012';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type Body = Record<string, unknown> | unknown[];

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** JSON body */
  body?: Body;
  /** multipart body (file uploads) */
  form?: FormData;
  /** attach the bearer token (default true) */
  auth?: boolean;
  /** on 401, clear the session and send the user to /login (default true when auth) */
  redirectOn401?: boolean;
  signal?: AbortSignal;
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = opts.body || opts.form ? 'POST' : 'GET', body, form, auth = true, signal } = opts;
  const redirectOn401 = opts.redirectOn401 ?? auth;

  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: form ?? (body ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError('Server is waking up or unreachable. Please try again in a moment.', 0);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && redirectOn401 && typeof window !== 'undefined') {
      clearSession();
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
    }
    const apiError = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : '';
    throw new ApiError(apiError || `Request failed (${res.status})`, res.status);
  }

  return data as T;
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong';
