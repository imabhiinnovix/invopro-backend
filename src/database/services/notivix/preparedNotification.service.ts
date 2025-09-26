/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import PreparedNotification from '../../models/notivix/preparedNotification';
import '../../models/notivix/notificationFrequencySetting';
import '../../models/notivix/notificationTemplate';
import '../../models/notivix/notificationTrigger';
import '../../models/notivix/notificationAcknowledge';
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
    { $set: { isActive: 'in-active' } },
    { new: true }
  );
};

/**
 * List Prepared Notifications
 */
export const listPreparedNotifications = async ({
  query = {},
  populate = [],
  skip = 0,
  limit = 20,
  sort = {},
}: {
  query?: Record<string, any>;
  populate?: string[];
  skip?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}) => {
  let dbQuery = PreparedNotification.find(query).sort(sort).skip(skip).limit(limit);

  populate.forEach((field) => {
    dbQuery = dbQuery.populate(field);
  });

  return await dbQuery.exec();
};

function buildNotificationPipeline({
  query = {},
  search,
  searchCondition,
}: {
  query?: Record<string, any>;
  search?: string;
  searchCondition: any[];
}) {
  const pipeline: any[] = [];

  // --- Base filters
  if (Object.keys(query).length > 0) {
    pipeline.push({ $match: query });
  }

  // --- Lookups
  pipeline.push(
    {
      $lookup: {
        from: 'notification_templates',
        localField: 'templateId',
        foreignField: '_id',
        as: 'templateId',
      },
    },
    {
      $lookup: {
        from: 'notification_triggers',
        localField: 'notificationTriggerId',
        foreignField: '_id',
        as: 'notificationTriggerId',
      },
    },
    {
      $lookup: {
        from: 'notification_types',
        localField: 'notificationTypeId',
        foreignField: '_id',
        as: 'notificationTypeId',
      },
    },
    {
      $lookup: {
        from: 'notification_frequency_settings',
        localField: 'frequencySettingId',
        foreignField: '_id',
        as: 'frequencySettingId',
      },
    },
    {
      $lookup: {
        from: 'notification_medium_settings',
        localField: 'mediumSettingId',
        foreignField: '_id',
        as: 'mediumSettingId',
      },
    },
    {
      $lookup: {
        from: 'notification_acknowledges',
        localField: 'acknowledgeId',
        foreignField: '_id',
        as: 'acknowledgeId',
      },
    },
    { $unwind: { path: '$templateId', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$notificationTriggerId', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$notificationTypeId', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$frequencySettingId', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$mediumSettingId', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$acknowledgeId', preserveNullAndEmptyArrays: true } }
  );

  // --- Global search
  if (search) {
    pipeline.push({
      $match: {
        $or: searchCondition,
      },
    });
  }

  return pipeline;
}

export const listPreparedNotificationsAgg = async ({
  query = {},
  search,
  skip = 0,
  limit = 20,
  sort = {},
  searchCondition,
}: {
  query?: Record<string, any>;
  search?: string;
  skip?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  searchCondition: any[];
}) => {
  const pipeline = buildNotificationPipeline({ query, search, searchCondition });

  // Sorting
  if (Object.keys(sort).length > 0) {
    pipeline.push({ $sort: sort });
  }

  // Pagination
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  return await PreparedNotification.aggregate(pipeline);
};

export const countPreparedNotificationsAgg = async ({
  query = {},
  search,
  searchCondition,
}: {
  query?: Record<string, any>;
  search?: string;
  searchCondition: any[];
}) => {
  const pipeline = buildNotificationPipeline({ query, search, searchCondition });

  pipeline.push({ $count: 'total' });

  const result = await PreparedNotification.aggregate(pipeline);
  return result[0]?.total || 0;
};

/**
 * Get Prepared Notification by ID
 */
export const getPreparedNotification = async (id: string, populate: string[]) => {
  let query = PreparedNotification.findById(id);

  populate.forEach((field) => {
    query = query.populate(field);
  });

  const result = await query.exec();
  if (!result) throw new Error('Prepared Notification not found');

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
  if (!result) throw new Error('Prepared Notification not found');

  return result;
};

export const countPreparedNotifications = async (query: Record<string, any> = {}) => {
  return PreparedNotification.countDocuments(query);
};
