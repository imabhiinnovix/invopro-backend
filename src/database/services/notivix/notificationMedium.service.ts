import NotificationMediumModel from '../../models/notivix/notificationMediumSetting';
import { Types } from 'mongoose';

interface MediumSetting {
  medium: 'email' | 'sms' | 'whatsapp' | 'slack' | 'inapp';
  fromAddress?: string;
  serviceName?: string;
  apiKey?: string;
  enabled?: boolean;
}

interface CreateNotificationMediumInput {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  mediumSettings: MediumSetting[];
}

interface UpdateNotificationMediumInput {
  mediumSettings?: MediumSetting[];
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
  productId,
}: {
  organizationId: Types.ObjectId;
  productId?: string;
}) => {
  const query: any = { organizationId };
  if (productId) {
    query.productId = productId;
  }

  return await NotificationMediumModel.find(query);
};

export const getNotificationMedium = async (
  id: string,
  { organizationId }: { organizationId: Types.ObjectId }
) => {
  return await NotificationMediumModel.findOne({ _id: id, organizationId });
};
