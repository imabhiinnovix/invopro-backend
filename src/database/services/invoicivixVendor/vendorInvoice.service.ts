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
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  let queryBuilder: any = VendorInvoice.find(query)
    .select(select)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sort);

  if (populate && Array.isArray(populate)) {
    populate.forEach((field: any) => {
      queryBuilder = queryBuilder.populate(field);
    });
  }

  const data = await queryBuilder.exec();
  const totalCount = await VendorInvoice.countDocuments(query);

  return { data, totalCount };
};

export const findOneByQuery = async (query: any) => {
  return await VendorInvoice.findOne(query);
};

export const countByQuery = async (query: any) => {
  return await VendorInvoice.countDocuments(query);
};