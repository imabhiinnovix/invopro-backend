import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response, NextFunction } from 'express';

export const runNaturalLanguageAggregation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, orgCode } = req.user;

    res.status(200).json({
      success: true,
      message: 'Widget theme selected successfully',
      data: { organizationId, orgCode },
    });
  } catch (err) {
    next(err);
  }
};
