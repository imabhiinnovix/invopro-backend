/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import PreparedNotification from "../../models/notivix/preparedNotification";
import "../../models/notivix/notificationFrequencySetting";
import "../../models/notivix/notificationTemplate";
import "../../models/notivix/notificationTrigger";
import "../../models/notivix/notificationAcknowledge";
/**
 * Create a new Prepared Notification
 */
export const createPreparedNotification = async (payload: any) => {
  return await PreparedNotification.create(payload);
};

/**
 * Update Prepared Notification by ID
 */
export const updatePreparedNotification = async (id: string, payload: any) => {
  return await PreparedNotification.findByIdAndUpdate(id, payload, { new: true });
};

/**
 * Soft delete Prepared Notification (mark inactive)
 */
export const deletePreparedNotification = async (id: string, organizationId: string) => {
  return await PreparedNotification.findOneAndUpdate(
    { _id: id, organizationId },
    { $set: { isActive: "in-active" } },
    { new: true }
  );
};

/**
 * List Prepared Notifications
 */
export const listPreparedNotifications = async ({
  query = {},
  populate = [],
}: {
  query?: Record<string, any>;
  populate?: string[];
}) => {
  let dbQuery = PreparedNotification.find(query);

  populate.forEach((field) => {
    dbQuery = dbQuery.populate(field);
  });

  return await dbQuery.exec();
};

/**
 * Get Prepared Notification by ID
 */
export const getPreparedNotification = async (
  id: string,
 populate: string[],
) => {
  let query = PreparedNotification.findById(id);

  populate.forEach((field) => {
    query = query.populate(field);
  });

  const result = await query.exec();
  if (!result) throw new Error("Prepared Notification not found");

  return result;
};

/**
 * Get Active Prepared Notification by acknowledgeId
 */
export const getActivePreparedNotificationByAck = async (ackId: string, populate: string[]) => {
  let query = PreparedNotification.findOne({ acknowledgeId: ackId });

  populate.forEach((field) => {
    query = query.populate(field);
  });

  const result = await query.exec();
  if (!result) throw new Error("Prepared Notification not found");

  return result;
};