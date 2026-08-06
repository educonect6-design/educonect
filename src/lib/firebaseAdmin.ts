import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export interface AdminHandles {
  auth: Auth;
  db: Firestore;
}

/**
 * Resolves to the Admin SDK handles when real credentials are available, or to
 * `null` when they aren't (so the role middleware can degrade to a no-op instead
 * of rejecting every request).
 *
 * Credentials are read from, in order:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON — the full service account JSON as a string
 *      (use this on hosts without Google metadata, e.g. Render).
 *   2. Application Default Credentials — GOOGLE_APPLICATION_CREDENTIALS locally,
 *      or the metadata server on Cloud Run / GCP.
 *
 * Note: `initializeApp()` succeeds even with no credentials present, so we must
 * actively fetch an access token to know whether they really work.
 */
export const adminReady: Promise<AdminHandles | null> = (async () => {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    const app: App = serviceAccountJson
      ? initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) })
      : initializeApp();

    // Probe for a real token — this is what distinguishes "configured" from "not configured".
    await app.options.credential!.getAccessToken();

    return { auth: getAuth(app), db: getFirestore(app) };
  } catch (e: any) {
    console.warn(
      '[firebaseAdmin] Firebase Admin não configurado — as rotas da API continuam abertas, sem checagem de papel. ' +
      'Para ativar, defina FIREBASE_SERVICE_ACCOUNT_JSON (ou GOOGLE_APPLICATION_CREDENTIALS). Detalhe: ' +
      String(e?.message).slice(0, 120)
    );
    return null;
  }
})();
