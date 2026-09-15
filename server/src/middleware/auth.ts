import { Response, NextFunction } from "express";
import { Request, ParamsDictionary } from "express-serve-static-core";
import { HttpError } from "./errorEnvelope";
import { verifySessionToken } from "../services/session";
import type { Role } from "../types/auth";

export type { Role } from "../types/auth";

export const COOKIE_NAME = "ttk_session";

export async function requireAuth<P = ParamsDictionary>(
  req: Request<P>,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!token) {
      throw new HttpError(401, "UNAUTHENTICATED", "Missing or invalid session");
    }

    const user = await verifySessionToken(token);
    if (!user || !user.isActive) {
      throw new HttpError(401, "UNAUTHENTICATED", "Missing or invalid session");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new HttpError(401, "UNAUTHENTICATED", "Missing or invalid session"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "FORBIDDEN_ROLE", "You do not have access to this resource"));
      return;
    }
    next();
  };
}

// api-spec.md header note: mustChangePassword=true is allowed through only
// /auth/change-password, /auth/logout, and /me — every other authenticated route is blocked.
export function blockIfPasswordChangeRequired(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    next(new HttpError(403, "PASSWORD_CHANGE_REQUIRED", "Password change is required before continuing"));
    return;
  }
  next();
}
