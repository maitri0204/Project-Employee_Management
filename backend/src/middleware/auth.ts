import { Request, Response, NextFunction } from "express";
import { AuthRequest, Role } from "../types";
import { verifyToken } from "../utils/jwt";
import { sendError } from "../utils/response";

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  const queryToken = req.query.token;
  if (typeof queryToken === "string" && queryToken.length > 0) {
    return queryToken;
  }
  return null;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

  if (!token) {
    return sendError(res, "Access denied. No token provided.", 401);
  }

  try {
    const decoded = verifyToken(token);
    (req as AuthRequest).user = decoded;
    next();
  } catch {
    return sendError(res, "Invalid or expired token.", 401);
  }
};

/** Supports Bearer header or `?token=` for SSE (EventSource cannot set headers). */
export const authenticateFromQueryOrHeader = authenticate;

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;

    if (!user || !roles.includes(user.role)) {
      return sendError(res, "Access denied. Insufficient permissions.", 403);
    }

    next();
  };
};

export const authorizeAdmin = authorize("ADMIN");
