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
  page = 1,
  limit = 10,
  sort = { createdAt: -1 },
  populate,
  paginate = true,
}: any) => {
  let vendorQuery: any = Vendor.find(query)
    .select(select)
    .sort(sort);

  // Apply pagination only if paginate = true
  if (paginate) {
    vendorQuery = vendorQuery
      .skip((page - 1) * limit)
      .limit(limit);
  }

  // Populate fields if provided
  if (populate && Array.isArray(populate)) {
    populate.forEach((field) => {
      vendorQuery = vendorQuery.populate(field);
    });
  }

  const vendors = await vendorQuery.exec();

  // Only count when pagination is needed (optimization)
  const totalCount = paginate
    ? await Vendor.countDocuments(query)
    : vendors.length;

  return {
    data: vendors,
    totalCount,
    ...(paginate && {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    }),
  };
};

export const findOneByQuery = async (query: any) => {
  return await Vendor.findOne(query);
};

export const countByQuery = async (query: any) => {
  return await Vendor.countDocuments(query);
};