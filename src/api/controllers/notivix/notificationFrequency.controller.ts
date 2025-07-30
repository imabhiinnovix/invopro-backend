import { Request, Response } from 'express';
import * as NotificationFrequencyService from '../../../database/services/notivix/notificationFrequency.service';

export const createNotificationFrequency = async (req: Request, res: Response) => {
  try {
    const data = await NotificationFrequencyService.createNotificationFrequency(req.body);
    res.status(201).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateNotificationFrequency = async (req: Request, res: Response) => {
  try {
    const data = await NotificationFrequencyService.updateNotificationFrequency(req.params.id, req.body);
    res.status(200).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteNotificationFrequency = async (req: Request, res: Response) => {
  try {
    await NotificationFrequencyService.deleteNotificationFrequency(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listNotificationFrequency = async (_req: Request, res: Response) => {
  try {
    const data = await NotificationFrequencyService.listNotificationFrequency();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getNotificationFrequency = async (req: Request, res: Response) => {
  try {
    const data = await NotificationFrequencyService.getNotificationFrequency(req.params.id);
    res.status(200).json(data);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};