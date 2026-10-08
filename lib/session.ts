// lib/session.ts — JWT session kept in localStorage (keys kept from the original app)

export type Role = 'ADMIN' | 'TUTOR' | 'STUDENT';

export interface Session {
  token: string;
  id: string;
  role: Role;
  courseId: string | null;
  cohortId: string | null;
  email?: string;
  studentName?: string;
  /** 2 = V2 intake student token */
  ver?: number;
  exp?: number;
}

const TOKEN_KEY = 'token';
const ROLE_KEY = 'userRole';

function decode(token: string): Omit<Session, 'token'> | null {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Current session, or null if missing, malformed or expired. */
export function getSession(): Session | null {
  const token = getToken();
  if (!token) return null;
  const payload = decode(token);
  if (!payload?.role) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return { ...payload, courseId: payload.courseId ?? null, cohortId: payload.cohortId ?? null, token };
}

export function saveSession(token: string, role: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export const isSuperAdmin = (s: Session | null | undefined) => s?.role === 'ADMIN' && !s.courseId;

/** Where a freshly signed-in user should land. */
export function homeFor(role: string) {
  return role === 'ADMIN' || role === 'TUTOR' ? '/admin' : '/student';
}

export function logout() {
  clearSession();
  window.location.href = '/login';
}
