import { initializeApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let isAdminReady = false;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

// Uses Application Default Credentials (works out of the box on Cloud Run and most
// Google-hosted environments). Locally, set GOOGLE_APPLICATION_CREDENTIALS to a service
// account JSON file to enable it — see .env.example. Without credentials, the API keeps
// working exactly like before (open, unauthenticated), just without the extra role check.
try {
  const app: App = initializeApp();
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
  isAdminReady = true;
} catch (e: any) {
  console.warn(
    '[firebaseAdmin] Firebase Admin não configurado — rotas da API continuam sem checagem de papel. ' +
    'Configure GOOGLE_APPLICATION_CREDENTIALS para ativar a verificação em produção.'
  );
}

export { adminAuth, adminDb, isAdminReady };
