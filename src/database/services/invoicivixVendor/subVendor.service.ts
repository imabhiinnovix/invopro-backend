/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions, Types } from 'mongoose';
import SubVendor from '../../models/invoicivixVendor/subVendor';

export const createSubVendor = async (data: any) => {
  const subVendor = new SubVendor(data);
  await subVendor.save();
  return subVendor;
};

export const findSubVendorById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = SubVendor.findById(id);
  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });
  return await query;
};

export const updateSubVendor = async (id: string, data: any) => {
  return await SubVendor.findByIdAndUpdate(id, data, { new: true });
};

export const deleteSubVendor = async (id: string) => {
  return await SubVendor.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
};

export const getSubVendorList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  let subVendorQuery: any = SubVendor.find(query)
    .select(select)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sort);

  if (populate && Array.isArray(populate)) {
    populate.forEach((field) => {
      subVendorQuery = subVendorQuery.populate(field);
    });
  }

  const subVendors = await subVendorQuery.exec();
  const totalCount = await SubVendor.countDocuments(query);

  return { data: subVendors, totalCount };
};

export const findOneByQuery = async (query: any) => {
  return await SubVendor.findOne(query);
};

export const countByQuery = async (query: any) => {
  return await SubVendor.countDocuments(query);
};