/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions, Types } from 'mongoose';
import VendorAttorney from '../../models/invoicivixVendor/vendorAttorney';

export const createVendorAttorney = async (data: any) => {
  const attorney = new VendorAttorney(data);
  await attorney.save();
  return attorney;
};

export const findVendorAttorneyById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = VendorAttorney.findById(id);
  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });
  return await query;
};

export const updateVendorAttorney = async (id: string, data: any) => {
  return await VendorAttorney.findByIdAndUpdate(id, data, { new: true });
};

export const deleteVendorAttorney = async (id: string) => {
  return await VendorAttorney.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
};

export const getVendorAttorneyList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  let queryBuilder: any = VendorAttorney.find(query)
    .select(select)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sort);

  if (populate && Array.isArray(populate)) {
    populate.forEach((field) => {
      queryBuilder = queryBuilder.populate(field);
    });
  }

  const data = await queryBuilder.exec();
  const totalCount = await VendorAttorney.countDocuments(query);

  return { data, totalCount };
};

export const findOneByQuery = async (query: any) => {
  return await VendorAttorney.findOne(query);
};

export const countByQuery = async (query: any) => {
  return await VendorAttorney.countDocuments(query);
};