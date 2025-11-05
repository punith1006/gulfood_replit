import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET;

if (!JWT_SECRET) {
  throw new Error("CRITICAL: SESSION_SECRET environment variable must be set for JWT authentication");
}

export interface AuthRequest extends Request {
  organizerEmail?: string;
  organizerRole?: string;
  exhibitorCode?: string;
}

export function generateOrganizerToken(email: string, role: string): string {
  return jwt.sign(
    { email, role, type: "organizer" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function generateExhibitorToken(code: string, companyName: string): string {
  return jwt.sign(
    { code, companyName, type: "exhibitor" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export function requireOrganizerAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authentication token provided" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== "organizer") {
      return res.status(403).json({ error: "Organizer authentication required" });
    }

    req.organizerEmail = decoded.email;
    req.organizerRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireExhibitorAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authentication token provided" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== "exhibitor") {
      return res.status(403).json({ error: "Exhibitor authentication required" });
    }

    req.exhibitorCode = decoded.code;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type === "organizer") {
      req.organizerEmail = decoded.email;
      req.organizerRole = decoded.role;
    } else if (decoded.type === "exhibitor") {
      req.exhibitorCode = decoded.code;
    }
  } catch (error) {
    // Token invalid, but continue without auth
  }

  next();
}
