import { Request, Response, NextFunction } from "express";
import { prepareTodayNotifications } from "../../../cronServices/prepareNotificationsForSlot";

export const triggerPrepareTodayNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(`[${new Date().toISOString()}] On-demand trigger called`);

    await prepareTodayNotifications();

    res.status(200).json({
      success: true,
      message: "prepareTodayNotifications executed successfully",
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] On-demand trigger failed:`, err);
    next(err);
  }
};