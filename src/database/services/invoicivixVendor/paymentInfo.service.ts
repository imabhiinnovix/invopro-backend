import { Types } from 'mongoose';
import Payment from '../../models/invoicivixVendor/paymentInfo';
import PurchaseOrder from '../../models/invoicivixVendor/purchaseOrder';
import { PopulateOptions } from 'mongoose';

/**
 * ================================
 * CREATE PAYMENT
 * ================================
 */
export const createPayment = async (data: any) => {
  const { purchaseOrderId } = data;

  const po = await PurchaseOrder.findById(purchaseOrderId);
  if (!po) throw new Error('Purchase Order not found');

  // ✅ Auto assign vendorId
  data.vendorId = po.vendorId;

  const payment = await Payment.create(data);

  await recalculatePOBalance(purchaseOrderId);

  return payment;
};

/**
 * ================================
 * RECALCULATE PO BALANCE
 * ================================
 */
export const recalculatePOBalance = async (poId: any) => {
  const totalPaid = await Payment.aggregate([
    {
      $match: {
        purchaseOrderId: new Types.ObjectId(poId),
        status: 'active',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ['$actualPaymentAmount', 0] } },
      },
    },
  ]);

  const paidAmount = totalPaid[0]?.total || 0;

  const po = await PurchaseOrder.findById(poId);

  const balance = (po?.poValue || 0) - paidAmount;

  await PurchaseOrder.findByIdAndUpdate(poId, {
    po_balance_value: balance,
  });
};



/**
 * ================================
 * FIND BY ID
 * ================================
 */
export const findPaymentById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = Payment.findById(id);

  populateFields.forEach((field) => {
    const pop: PopulateOptions =
      typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

/**
 * ================================
 * UPDATE
 * ================================
 */
export const updatePayment = async (id: string, data: any) => {
  const updated = await Payment.findByIdAndUpdate(id, data, { new: true });

  if (updated?.purchaseOrderId) {
    await recalculatePOBalance(updated.purchaseOrderId);
  }

  return updated;
};

/**
 * ================================
 * DELETE
 * ================================
 */
export const deletePayment = async (paymentId: string) => {
  const deleted = await Payment.findByIdAndUpdate(
    paymentId,
    { status: 'inactive' },
    { new: true }
  );

  if (deleted?.purchaseOrderId) {
    await recalculatePOBalance(deleted.purchaseOrderId);
  }

  return deleted;
};

/**
 * ================================
 * LIST
 * ================================
 */
export const getPaymentList = async ({ query, page, limit, populate }: any) => {
  let paymentQuery: any = Payment.find(query)
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
 * ================================
 * SUMMARY (FAST 🔥)
 * ================================
 */
export const getPaymentSummary = async ({
  organizationId,
  vendorName,
}: any) => {
  const pipeline: any[] = [
    {
      $match: {
        organizationId: new Types.ObjectId(organizationId),
        status: 'active',
        paymentStatus: 'settled',
      },
    },

    /**
     * ✅ GROUP BY vendorId (NO PO lookup)
     */
    {
      $group: {
        _id: '$vendorId',

        payments: {
          $push: {
            transactionId: '$transactionId',
            purchaseOrderId: '$purchaseOrderId',
            grossPaymentAmount: '$grossPaymentAmount',
            taxDeduction: '$taxDeduction',
            actualPaymentAmount: '$actualPaymentAmount',
            paymentDate: '$paymentDate',
          },
        },

        totalGross: { $sum: { $ifNull: ['$grossPaymentAmount', 0] } },
        totalTax: { $sum: { $ifNull: ['$taxDeduction', 0] } },
        totalActual: { $sum: { $ifNull: ['$actualPaymentAmount', 0] } },
      },
    },

    /**
     * JOIN VENDOR
     */
    {
      $lookup: {
        from: 'vendors',
        localField: '_id',
        foreignField: '_id',
        as: 'vendor',
      },
    },
    { $unwind: '$vendor' },

    ...(vendorName
      ? [
          {
            $match: {
              'vendor.name': { $regex: vendorName, $options: 'i' },
            },
          },
        ]
      : []),

    {
      $project: {
        _id: 0,
        vendorId: '$_id',
        vendorName: '$vendor.name',
        vendorCode: '$vendor.code',
        payments: 1,
        totalGross: 1,
        totalTax: 1,
        totalActual: 1,
      },
    },

    { $sort: { totalActual: -1 } },
  ];

  return await Payment.aggregate(pipeline);
};

export const findOneByQuery = async (query: any) => {
  return await Payment.findOne(query);
};