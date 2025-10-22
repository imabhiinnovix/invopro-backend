/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import NotificationType from '../../models/notivix/notificationType';

export const createNotificationType = async (payload: any) => {
  return await NotificationType.create(payload);
};

export const updateNotificationType = async (
  query: Record<string, any>,
  payload: any
) => {
  const doc = await NotificationType.findOneAndUpdate(query, payload, { new: true });
  if (!doc) throw new Error('Notification type not found or unauthorized');
  return doc;
};

export const deleteNotificationType = async (query: Record<string, any>) => {
  const doc = await NotificationType.findOneAndUpdate(
    query,
    { $set: { status: 'in-active' } },
    { new: true } // return the updated document
  );
  if (!doc) throw new Error('Notification type not found or unauthorized');
  return doc;
};

export const listNotificationType = async ({
  query,
  select = '',
  page = 1,
  limit = 10,
  sort = { updatedAt: -1 },
  populate,
}: {
  query: Record<string, any>;
  select?: string;
  page?: number;
  limit?: number;
  sort?: any;
  populate?: string[];
}) => {
  try {
    let notificationQuery: any = NotificationType.find(query)
      .select(select)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate && Array.isArray(populate)) {
      populate.forEach((field) => {
        notificationQuery = notificationQuery.populate(field);
      });
    }

    const data = await notificationQuery.lean().exec();
    const totalCount = await NotificationType.countDocuments(query);

    return { data, totalCount };
  } catch (err) {
    throw err;
  }
};


export const getNotificationType = async (query: Record<string, any>) => {
  const doc = await NotificationType.findOne(query);
  if (!doc) throw new Error('Notification type not found or unauthorized');
  return doc;
};