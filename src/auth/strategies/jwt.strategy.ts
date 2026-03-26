import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  orgId: string;
  email?: string;
  type?: string;
}

// Dev-only fallback to keep local bootstrapping working until env vars are set.
const DEV_ONLY_ACCESS_SECRET = 'dev-access-secret-change-me';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || DEV_ONLY_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      organizationId: payload.orgId,
      ...(payload.email != null && payload.email !== '' ? { email: payload.email } : {}),
    };
  }
}
