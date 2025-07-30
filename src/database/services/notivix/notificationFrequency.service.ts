import NotificationFrequencySetting from '../../models/notivix/notificationFrequencySetting';

export const createNotificationFrequency = async (payload: any) => {
  return await NotificationFrequencySetting.create(payload);
};

export const updateNotificationFrequency = async (id: string, payload: any) => {
  return await NotificationFrequencySetting.findByIdAndUpdate(id, payload, { new: true });
};

export const deleteNotificationFrequency = async (id: string) => {
  return await NotificationFrequencySetting.findByIdAndDelete(id);
};

export const listNotificationFrequency = async () => {
  return await NotificationFrequencySetting.find();
};

export const getNotificationFrequency = async (id: string) => {
  const doc = await NotificationFrequencySetting.findById(id);
  if (!doc) throw new Error('Notification frequency not found');
  return doc;
};