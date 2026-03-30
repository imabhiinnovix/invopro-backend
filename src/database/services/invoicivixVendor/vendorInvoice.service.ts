/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions } from 'mongoose';
import VendorInvoice from '../../models/invoicivixVendor/vendorInvoice';

export const createVendorInvoice = async (data: any) => {
  const invoice = new VendorInvoice(data);
  await invoice.save();
  return invoice;
};

export const findVendorInvoiceById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = VendorInvoice.findById(id);

  populateFields.forEach((field) => {
    const pop: PopulateOptions =
      typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const updateVendorInvoice = async (id: string, data: any) => {
  return await VendorInvoice.findByIdAndUpdate(id, data, { new: true });
};

export const deleteVendorInvoice = async (id: string) => {
  return await VendorInvoice.findByIdAndUpdate(
    id,
    { status: 'inactive' },
    { new: true }
  );
};

export const getVendorInvoiceList = async ({
  query = {},
  select = '',
  page = 1,
  limit = 10,
  sort = { createdAt: -1 },
  populate,
  paginate = true,
}: any) => {
  let queryBuilder: any = VendorInvoice.find(query)
    .select(select)
    .sort(sort);

  // Apply pagination only if enabled
  if (paginate) {
    const skip = (page - 1) * limit;
    queryBuilder = queryBuilder.skip(skip).limit(limit);
  }

  // Populate if provided
  if (populate && Array.isArray(populate)) {
    populate.forEach((field: any) => {
      queryBuilder = queryBuilder.populate(field);
    });
  }

  const [data, totalCount] = await Promise.all([
    queryBuilder.exec(),
    VendorInvoice.countDocuments(query),
  ]);

  return { data, totalCount };
};

export const findOneByQuery = async (query: any) => {
  return await VendorInvoice.findOne(query);
};

export const countByQuery = async (query: any) => {
  return await VendorInvoice.countDocuments(query);
};