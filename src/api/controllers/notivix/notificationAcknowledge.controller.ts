/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import { Request, Response, NextFunction } from "express";
import {
  getNotificationAcknowledge,
  updateNotificationAcknowledge,
  markNotificationAcknowledgeCompleted,
} from "../../../database/services/notivix/notificationAcknowledge.service";
import { getActivePreparedNotificationByAck } from "../../../database/services/notivix/preparedNotification.service";
import { processNotification } from "../../../database/services/notivix/notificationTriggerService";

export const sendAcknowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ackId } = req.params;
    const {identifierKey} = req.body;

    if (!ackId || !identifierKey) {
      return res.status(204).json({
        success: false,
        message: "Page Expired or Not Found",
      });
    }

    // 1️⃣ Get acknowledge record
    const acknowledgeData = await getNotificationAcknowledge(ackId);
    console.log('acknowledgeData', acknowledgeData, identifierKey);
    if (
      !acknowledgeData ||
      acknowledgeData.identifierKey !== identifierKey ||
      acknowledgeData.processingStatus !== "pending"
    ) {
      return res.status(204).json({
        success: false,
        message: "Page Expired or Not Found",
      });
    }

    // 2️⃣ Update acknowledge log → processing
    const updatedAck = await updateNotificationAcknowledge(ackId, {
      processingStatus: "processing",
      triggerDate: new Date(),
    });
    
    // 3️⃣ Get related active prepared notification
    const notification = await getActivePreparedNotificationByAck(ackId,["templateId","frequencySettingId","notificationTriggerId","acknowledgeId"]);
    if (!notification) {
      return res.status(204).json({
        success: false,
        message: "Page Expired or Not Found",
      });
    }

    // 5️⃣ Dispatch email
    await processNotification(notification,{acknowledgeEmail: true});

    // 6️⃣ Mark acknowledge as completed
    await markNotificationAcknowledgeCompleted(ackId);

    res.status(201).json({
      success: true,
      message: "Acknowledgement Email has been sent successfully",
    });
  } catch (error) {
    console.error("❌ Error in sendAcknowledge:", error);
    next(error);
  }
};