/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import NotificationMediumModel from '../../models/notivix/notificationMediumSetting';
import { Types } from 'mongoose';

interface CreateNotificationMediumInput {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  medium: 'email' | 'sms' | 'whatsapp' | 'slack' | 'inapp';
  fromAddress?: string;
  serviceName?: string;
  apiKey?: string;
  enabled?: boolean;
}

interface UpdateNotificationMediumInput {
  medium?: 'email' | 'sms' | 'whatsapp' | 'slack' | 'inapp';
  fromAddress?: string;
  serviceName?: string;
  apiKey?: string;
  enabled?: boolean;
}

export const createNotificationMedium = async (
  input: CreateNotificationMediumInput
) => {
  return await NotificationMediumModel.create(input);
};


/**
 * Insert many notification medium documents at once.
 * Expects payloadArray to already be shaped correctly by the controller.
 */
export const createManyNotificationMediums = async (payloadArray: CreateNotificationMediumInput[]) => {
  // Directly insert what's passed in (no validation/normalization here)
  return await NotificationMediumModel.insertMany(payloadArray, { ordered: false });
};

export const updateNotificationMedium = async (
  id: string,
  input: UpdateNotificationMediumInput
) => {
  return await NotificationMediumModel.findByIdAndUpdate(id, input, {
    new: true,
  });
};

export const deleteNotificationMedium = async (
  id: string,
  organizationId: Types.ObjectId
) => {
  return await NotificationMediumModel.findOneAndDelete({ _id: id, organizationId });
};

/**
 * Delete many notification medium docs by an array of ids, scoped to organizationId.
 * @param ids Array<string | ObjectId>
 * @param organizationId Types.ObjectId
 * @returns result of deleteMany
 */
export const deleteNotificationMediumsByIds = async (ids: (string | Types.ObjectId)[], organizationId: Types.ObjectId) => {
  // Normalize valid string ids to ObjectId
  const objectIds = ids.map((id) => (Types.ObjectId.isValid(String(id)) ? new Types.ObjectId(String(id)) : id));

  const res = await NotificationMediumModel.deleteMany({
    _id: { $in: objectIds },
    organizationId,
  });

  return res; // { acknowledged, deletedCount }
};

export const listNotificationMediums = async (query: Record<string, any>) => {
  return await NotificationMediumModel.find(query);
};

export const getNotificationMedium = async (
  id: string,
  { organizationId }: { organizationId: Types.ObjectId }
) => {
  return await NotificationMediumModel.findOne({ _id: id, organizationId });
};
