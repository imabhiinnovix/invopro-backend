import NotificationMediumModel from '../../models/notivix/notificationMediumSetting';
import { Types } from 'mongoose';

interface CreateNotificationMediumInput {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
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

export const listNotificationMediums = async ({
  organizationId,
}: {
  organizationId: Types.ObjectId;
}) => {
  return await NotificationMediumModel.find({ organizationId });
};

export const getNotificationMedium = async (
  id: string,
  { organizationId }: { organizationId: Types.ObjectId }
) => {
  return await NotificationMediumModel.findOne({ _id: id, organizationId });
};
