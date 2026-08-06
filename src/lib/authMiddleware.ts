import { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb, isAdminReady } from './firebaseAdmin';

/**
 * Minimal role gate for the write endpoints that matter (creating activities, grading,
 * responding to justifications, posting announcements/report cards). When the Admin SDK
 * has no credentials configured (see firebaseAdmin.ts), this becomes a no-op so local
 * dev keeps working without extra setup — the check only activates where it's configured.
 */
export function requireRole(role: 'aluno' | 'professor') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isAdminReady) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }

    try {
      const decoded = await adminAuth!.verifyIdToken(idToken);
      const profileSnap = await adminDb!.collection('users').doc(decoded.uid).get();
      const profileRole = profileSnap.exists ? profileSnap.data()?.role : null;

      if (profileRole !== role) {
        res.status(403).json({ error: 'Você não tem permissão para executar esta ação.' });
        return;
      }

      next();
    } catch (err) {
      console.error('[authMiddleware] Token inválido:', err);
      res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
  };
}
