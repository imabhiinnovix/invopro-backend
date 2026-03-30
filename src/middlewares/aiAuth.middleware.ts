// middleware/aiAuth.middleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateAIToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Missing AI token" });
    }

    const decoded: any = jwt.verify(
      token,
      process.env.AI_WEBHOOK_SECRET!
    );

    // ✅ Scope validation
    if (decoded.scope !== "ai:invoice:process") {
      return res.status(403).json({ message: "Invalid scope" });
    }

    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired AI token" });
  }
};