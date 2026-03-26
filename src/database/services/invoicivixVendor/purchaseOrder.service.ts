/* eslint-disable @typescript-eslint/no-explicit-any */
import PurchaseOrder from '../../models/invoicivixVendor/purchaseOrder';
import Payment from '../../models/invoicivixVendor/paymentInfo';
import { Types } from 'mongoose';

/**
 * CREATE PO
 */
export const createPurchaseOrder = async (payload: any) => {
  payload.balance_po_amount = payload.poValue; // 🔥 initial balance

  return PurchaseOrder.create(payload);
};

/**
 * LIST PO
 */
export const getPurchaseOrderList = async ({ query, page, limit, populate }: any) => {
  let paymentQuery: any = PurchaseOrder.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (populate) {
    populate.forEach((p: any) => {
      paymentQuery = paymentQuery.populate(p);
    });
  }

  const data = await paymentQuery;
  const totalCount = await Payment.countDocuments(query);

  return { data, totalCount };
};

/**
 * GET BY ID
 */
export const findPurchaseOrderById = async (id: string) => {
  return PurchaseOrder.findById(id).populate('vendorId', 'name code');
};

/**
 * UPDATE
 */
export const updatePurchaseOrder = async (id: string, payload: any) => {
  return PurchaseOrder.findByIdAndUpdate(id, payload, { new: true });
};

/**
 * DELETE (SOFT)
 */
export const deletePurchaseOrder = async (id: string) => {
  return PurchaseOrder.findByIdAndUpdate(id, { status: 'inactive' });
};

/**
 * 🔥 UPDATE BALANCE AFTER PAYMENT
 */
export const updatePOBalance = async (purchaseOrderId: Types.ObjectId) => {
  const payments = await Payment.aggregate([
    {
      $match: {
        purchaseOrderId,
        status: 'active',
      },
    },
    {
      $group: {
        _id: '$purchaseOrderId',
        totalPaid: {
          $sum: '$actualPaymentAmount',
        },
      },
    },
  ]);

  const totalPaid = payments[0]?.totalPaid || 0;

  const po = await PurchaseOrder.findById(purchaseOrderId);

  if (!po) return;

  const newBalance = (po.poValue || 0) - totalPaid;

  await PurchaseOrder.findByIdAndUpdate(purchaseOrderId, {
    balance_po_amount: newBalance < 0 ? 0 : newBalance,
  });
};

/**
 * SUMMARY (Vendor-wise PO)
 */
export const getPOSummary = async ({ organizationId }: any) => {
  return PurchaseOrder.aggregate([
    {
      $match: {
        organizationId: new Types.ObjectId(organizationId),
        status: 'active',
      },
    },
    {
      $lookup: {
        from: 'vendors',
        localField: 'vendorId',
        foreignField: '_id',
        as: 'vendor',
      },
    },
    { $unwind: '$vendor' },

    {
      $group: {
        _id: '$vendorId',
        vendorName: { $first: '$vendor.name' },

        totalPOValue: { $sum: '$poValue' },
        totalBalance: { $sum: '$balance_po_amount' },
        totalPOs: { $sum: 1 },
      },
    },
  ]);
};

export const findPurchaseOrderByQuery = async (query: any) => {
  return PurchaseOrder.findOne(query);
};