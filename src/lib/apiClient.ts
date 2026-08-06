import { auth } from './firebase';

/**
 * Same as `fetch`, but attaches the current Firebase ID token as a Bearer
 * token — required by the API routes gated with `requireRole` on the server
 * (creating/grading activities, posting announcements, etc).
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
