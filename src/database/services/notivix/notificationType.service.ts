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
  const doc = await NotificationType.findOneAndDelete(query);
  if (!doc) throw new Error('Notification type not found or unauthorized');
  return doc;
};

export const listNotificationType = async (query: Record<string, any>) => {
  return await NotificationType.find(query);
};

export const getNotificationType = async (query: Record<string, any>) => {
  const doc = await NotificationType.findOne(query);
  if (!doc) throw new Error('Notification type not found or unauthorized');
  return doc;
};