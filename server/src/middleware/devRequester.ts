import { Response, NextFunction } from "express";
import { Request, ParamsDictionary } from "express-serve-static-core";
import { prisma } from "../prisma";
import { HttpError } from "./errorEnvelope";

export interface DevRequesterContext {
  id: number;
  name: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requester?: DevRequesterContext;
    }
  }
}

export async function resolveDevRequester<P = ParamsDictionary>(
  req: Request<P>,
  _res: Response,
  next: NextFunction,
) {
  try {
    const header = req.header("x-dev-requester-id");
    const id = header ? Number(header) : NaN;

    if (!header || Number.isNaN(id)) {
      throw new HttpError(401, "UNAUTHENTICATED", "Missing or invalid x-dev-requester-id header");
    }

    const requester = await prisma.requester.findUnique({ where: { id } });
    if (!requester || !requester.isActive) {
      throw new HttpError(401, "UNAUTHENTICATED", "Development requester could not be resolved");
    }

    req.requester = { id: requester.id, name: requester.name, email: requester.email };
    next();
  } catch (error) {
    next(error);
  }
}
