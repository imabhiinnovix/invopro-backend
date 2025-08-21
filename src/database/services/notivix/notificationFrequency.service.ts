/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import NotificationFrequencySetting from '../../models/notivix/notificationFrequencySetting';

export const createNotificationFrequency = async (payload: any) => {
  return await NotificationFrequencySetting.create(payload);
};

export const updateNotificationFrequency = async (id: string, payload: any) => {
  return await NotificationFrequencySetting.findByIdAndUpdate(id, payload, { new: true });
};

export const deleteNotificationFrequency = async (
  id: string,
  organizationId: string
) => {
  const result = await NotificationFrequencySetting.findOneAndUpdate(
    { _id: id, organizationId },
    { $set: { isActive: 'in-active' } },
    { new: true } // return the updated document
  );

  return result;
};

export const listNotificationFrequency = async ({
  query = {},
  populate = [],
}: {
  query?: Record<string, any>;
  populate?: string[];
}) => {
  let dbQuery = NotificationFrequencySetting.find(query);

  populate.forEach(field => {
    dbQuery = dbQuery.populate(field);
  });

  return await dbQuery.exec();
};

export const getNotificationFrequency = async (
  id: string,
  {
    organizationId,
    populate = [],
  }: { organizationId: string; populate?: string[] }
) => {
  let query = NotificationFrequencySetting.findOne({ _id: id, organizationId });

  populate.forEach(field => {
    query = query.populate(field);
  });

  const result = await query.exec();
  if (!result) throw new Error('Notification Frequency not found');

  return result;
};
