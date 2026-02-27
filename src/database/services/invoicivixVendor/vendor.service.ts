/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions } from 'mongoose';
import Vendor from '../../models/invoicivixVendor/vendor';

export const createVendor = async (data: any) => {
  const vendor = new Vendor(data);
  await vendor.save();
  return vendor;
};

export const findVendorById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = Vendor.findById(id);

  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const updateVendor = async (vendorId: string, data: any) => {
  return await Vendor.findByIdAndUpdate(vendorId, data, { new: true });
};

export const deleteVendor = async (vendorId: string) => {
  return await Vendor.findByIdAndUpdate(
    vendorId,
    { status: 'inactive' },
    { new: true } // returns updated document
  );
};

export const getVendorList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  let vendorQuery: any = Vendor.find(query)
    .select(select)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sort);

  if (populate && Array.isArray(populate)) {
    populate.forEach((field) => {
      vendorQuery = vendorQuery.populate(field);
    });
  }

  const vendors = await vendorQuery.exec();
  const totalCount = await Vendor.countDocuments(query);

  return { data: vendors, totalCount };
};

export const findOneByQuery = async (query: any) => {
  return await Vendor.findOne(query);
};