/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions } from 'mongoose';
import EngagementLetter from '../../models/invoicivixVendor/engagementLetter';

export const createEngagementLetter = async (data: any) => {
  const engagementLetter = new EngagementLetter(data);
  await engagementLetter.save();
  return engagementLetter;
};

export const findEngagementLetterById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = EngagementLetter.findById(id);

  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const updateEngagementLetter = async (id: string, data: any) => {
  return await EngagementLetter.findByIdAndUpdate(id, data, { new: true });
};

export const deleteEngagementLetter = async (engagementLetterId: string) => {
  return await EngagementLetter.findByIdAndUpdate(
    engagementLetterId,
    { status: 'inactive' },
    { new: true } // returns updated document
  );
};

export const getEngagementLetterList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  let letterQuery: any = EngagementLetter.find(query)
    .select(select)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sort);

  if (populate && Array.isArray(populate)) {
    populate.forEach((field) => {
      letterQuery = letterQuery.populate(field);
    });
  }

  const data = await letterQuery.exec();
  const totalCount = await EngagementLetter.countDocuments(query);

  return { data, totalCount };
};

export const findOneByQuery = async (query: any) => {
  return await EngagementLetter.findOne(query);
};