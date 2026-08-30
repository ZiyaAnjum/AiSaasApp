import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { User, PlanTier } from './types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ai-saas-platform-ultra-secure-jwt-secret-key-2026'
);

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: Partial<User>): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    planId: user.planId,
    status: user.status,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export interface AuthTokenPayload extends JWTPayload {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  planId: PlanTier;
  status: 'active' | 'blocked';
}

export async function verifyToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  // Also check cookie if available
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => c.split('='))
    );
    if (cookies.token) {
      return cookies.token;
    }
  }
  return null;
}

// Plan tier hierarchy check
export const PLAN_RANKS: Record<PlanTier, number> = {
  free: 1,
  starter: 2,
  pro: 3,
  enterprise: 4,
};

export function isPlanSufficient(userPlan: PlanTier, requiredPlan: PlanTier): boolean {
  return (PLAN_RANKS[userPlan] || 0) >= (PLAN_RANKS[requiredPlan] || 0);
}
