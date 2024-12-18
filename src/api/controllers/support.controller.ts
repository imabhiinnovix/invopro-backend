import { Request, Response, NextFunction } from 'express';

import * as supportService from '../../database/services/support.service';
import { sendSupportEmail } from '../../utils/mail.util';

export const createSupportTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, organizationId } = req.user;
    const { name, email, subject, message } = req.body;

    await supportService.createSupport({
      ...req.body,
      userId,
      organizationId,
    });

    await sendSupportEmail({ name, subject, email, message });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateSupportTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supportId } = req.params;
    await supportService.updateSupport(supportId, req.body);

    res.status(200).json({ success: true, message: 'Support ticket updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const deleteSupportTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // await supportService.deleteSupport(req.params.supportTicketId);
    const { supportId } = req.params;

    await supportService.updateSupport(supportId, { isDeleted: true });

    res.status(200).json({ success: true, message: 'Support ticket deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const getSupportTicketById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supportTicket = await supportService.getSupport({
      _id: req.params.supportId,
    });

    res.status(200).json({
      success: true,
      message: 'Support ticket fetched successfully',
      data: supportTicket,
    });
  } catch (err) {
    next(err);
  }
};

export const getSupportList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supportTickets = await supportService.getSupportList({ query: {}, sort: { status: -1 } });
    res.status(200).json({
      success: true,
      message: 'Support tickets fetched successfully',
      data: supportTickets,
    });
  } catch (err) {
    next(err);
  }
};
