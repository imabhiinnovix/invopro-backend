// middleware/aiAuth.middleware.ts

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyAIToken } from "../utils/token.utils";

export const authenticateAIToken = async(
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

    const decoded: any = await verifyAIToken(token);

    // ✅ Scope validation
    if (decoded.scope !== "ai:invoice:process") {
      return res.status(403).json({ message: "Invalid scope" });
    }

    req.user = {
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        orgCode: decoded.orgCode,
        orgDefaultCurrency: decoded.orgDefaultCurrency,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired AI token" });
  }
};