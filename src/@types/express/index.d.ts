import type { AccessTokenPayload } from "../../lib/auth/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};

