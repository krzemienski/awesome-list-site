// In-memory session store for serverless environment
// Note: Sessions won't persist across serverless instances
// For production, use a Redis-based session store

export interface Session {
  userId: string;
  email: string;
  role: string;
  expires: number;
}

// Global session store
const globalSessions = new Map<string, Session>();

export function getSession(sessionId: string): Session | undefined {
  return globalSessions.get(sessionId);
}

export function setSession(sessionId: string, session: Session): void {
  globalSessions.set(sessionId, session);
}

export function deleteSession(sessionId: string): void {
  globalSessions.delete(sessionId);
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
