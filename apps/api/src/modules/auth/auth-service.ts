import jwt from 'jsonwebtoken';
import type { Request } from 'express';

import { GuestSessionTokenClaims, UserRole } from '@lifebridge/shared';

export interface RequestIdentity {
  userId: string;
  role: UserRole;
  preferredLocale: string;
  email?: string;
}

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  user_metadata?: {
    display_name?: string;
    preferred_locale?: string;
    role?: UserRole;
  };
  app_metadata?: {
    role?: UserRole;
  };
}

export class AuthService {
  constructor(
    private readonly guestJwtSecret: string,
    private readonly supabaseJwtSecret?: string,
  ) { }

  issueGuestToken(claims: GuestSessionTokenClaims) {
    return jwt.sign(claims, this.guestJwtSecret, {
      expiresIn: '12h',
      issuer: 'lifebridge-ai',
      subject: claims.participantId,
    });
  }

  verifyGuestToken(token: string): GuestSessionTokenClaims {
    return jwt.verify(token, this.guestJwtSecret) as GuestSessionTokenClaims;
  }

  resolveIdentity(request: Request): RequestIdentity | null {
    const authHeader = request.header('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[Auth] No Bearer token in request');
      return null;
    }

    const token = authHeader.slice(7);
    console.log(`[Auth] Token received: ${token.slice(0, 20)}...`);
    console.log(`[Auth] JWT secret configured: ${!!this.supabaseJwtSecret}, length: ${this.supabaseJwtSecret?.length}`);
    return this.verifySupabaseJwt(token);
  }

  private verifySupabaseJwt(token: string): RequestIdentity | null {
    if (!this.supabaseJwtSecret) {
      console.error('[Auth] No Supabase JWT secret configured');
      return null;
    }

    try {
      const decoded = jwt.verify(token, this.supabaseJwtSecret, {
        algorithms: ['HS256'],
      }) as SupabaseJwtPayload;

      if (!decoded.sub) {
        console.error('[Auth] JWT decoded but no sub claim');
        return null;
      }

      const role: UserRole =
        decoded.app_metadata?.role ??
        decoded.user_metadata?.role ??
        'user';

      console.log(`[Auth] Identity resolved: userId=${decoded.sub}, role=${role}`);

      return {
        userId: decoded.sub,
        role,
        preferredLocale: decoded.user_metadata?.preferred_locale ?? 'en',
        email: decoded.email,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Auth] JWT verification FAILED: ${message}`);
      return null;
    }
  }
}
