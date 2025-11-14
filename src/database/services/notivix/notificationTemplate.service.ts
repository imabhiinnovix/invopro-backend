/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import NotificationTemplate from '../../models/notivix/notificationTemplate';
import { Types } from 'mongoose';

export const createNotificationTemplate = async (data: any) => {
  return await NotificationTemplate.create(data);
};

export const getNotificationTemplates = async ({
  query = {},
  select = "",
  page = 1,
  limit = 10,
  sort = { createdAt: -1 },
  populate = [],
}: {
  query?: any;
  select?: string;
  page?: number;
  limit?: number;
  sort?: any;
  populate?: string[]; // always expected as array
}) => {
  const skip = (page - 1) * limit;
  const totalCount = await NotificationTemplate.countDocuments(query);

  let queryBuilder = NotificationTemplate.find(query)
    .select(select)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Check if populate is a valid array with at least one element
  if (Array.isArray(populate) && populate.length > 0) {
    populate.forEach((field) => {
      queryBuilder = queryBuilder.populate(field);
    });
  }

  const templates = await queryBuilder.exec();

  return {
    data: templates,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
    },
  };
};


export const getNotificationTemplateById = async (id: string) => {
  return await NotificationTemplate.findById(id);
};

export const updateNotificationTemplate = async (id: string, data: any) => {
  return await NotificationTemplate.findByIdAndUpdate(id, data, { new: true });
};

export const deleteNotificationTemplate = async (id: string, status: any) => {
  const result = await NotificationTemplate.findOneAndUpdate(
    { _id: id },
    { $set: { status } },
    { new: true } // return the updated document
  );

  return result;
};
