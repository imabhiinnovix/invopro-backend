/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import NotificationAcknowledge from '../../models/notivix/notificationAcknowledge';

/**
 * Create a new Notification Acknowledge record
 */
export const createNotificationAcknowledge = async (payload: any) => {
  return await NotificationAcknowledge.create(payload);
};

/**
 * Update an existing Notification Acknowledge record by ID
 */
export const updateNotificationAcknowledge = async (id: string, payload: any) => {
  return await NotificationAcknowledge.findByIdAndUpdate(id, payload, { new: true });
};

/**
 * Soft delete Notification Acknowledge (set processing_status = 'deleted' or similar)
 */
export const deleteNotificationAcknowledge = async (
  id: string,
  organizationId: string
) => {
  const result = await NotificationAcknowledge.findOneAndUpdate(
    { _id: id, organizationId },
    { $set: { processing_status: 'deleted' } }, // 👈 you can change to 'inactive' if you prefer
    { new: true }
  );
  return result;
};

/**
 * List Notification Acknowledge records
 */
export const listNotificationAcknowledge = async ({
  query = {},
  populate = [],
}: {
  query?: Record<string, any>;
  populate?: string[];
}) => {
  let dbQuery = NotificationAcknowledge.find(query);

  populate.forEach(field => {
    dbQuery = dbQuery.populate(field);
  });

  return await dbQuery.exec();
};

/**
 * Get a single Notification Acknowledge by ID
 */
export const getNotificationAcknowledge = async (
  id: string,
  populate = []
) => {
  let query = NotificationAcknowledge.findById(id);

  populate.forEach(field => {
    query = query.populate(field);
  });

  const result = await query.exec();
  if (!result) throw new Error('Notification Acknowledge not found');

  return result;
};

/**
 * Mark Notification Acknowledge as completed
 */
export const markNotificationAcknowledgeCompleted = async (ackId: string) => {
  return await NotificationAcknowledge.findByIdAndUpdate(
    ackId,
    {
      $set: {
        processingStatus: "completed", // PROCESSING_STATUS_COMPLETED
      },
    },
    { new: true }
  );
};
