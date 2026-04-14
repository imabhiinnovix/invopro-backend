/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions } from 'mongoose';
import Activity from '../../models/invoicivixVendor/activity';

export const createActivity = async (data: any) => {
  const activity = new Activity(data);
  await activity.save();
  return activity;
};

export const findActivityById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = Activity.findById(id);

  populateFields.forEach((field) => {
    const pop: PopulateOptions =
      typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const updateActivity = async (id: string, data: any) => {
  return await Activity.findByIdAndUpdate(id, data, { new: true });
};

export const deleteActivity = async (id: string) => {
  return await Activity.findByIdAndUpdate(
    id,
    { status: 'inactive' },
    { new: true }
  );
};

export const getActivityList = async ({
  query = {},
  page = 1,
  limit = 10,
  sort = { createdAt: -1 },
  paginate = true,
}: any) => {
  let mongoQuery = Activity.find(query).sort(sort);

  // Apply pagination only if enabled
  if (paginate) {
    const skip = (page - 1) * limit;
    mongoQuery = mongoQuery.skip(skip).limit(limit);
  }

  const [data, totalCount] = await Promise.all([
    mongoQuery,
    Activity.countDocuments(query),
  ]);

  return { data, totalCount };
};

export const findOneByQuery = async (
  query: any,
  sort: any = { createdAt: -1 } // default latest
) => {
  return await Activity.findOne(query).sort(sort);
};