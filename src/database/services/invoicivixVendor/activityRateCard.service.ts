/* eslint-disable @typescript-eslint/no-explicit-any */
import { PopulateOptions } from 'mongoose';
import ActivityRateCard from '../../models/invoicivixVendor/activityRateCard';

export const createActivityRateCard = async (data: any) => {
  const rateCard = new ActivityRateCard(data);
  await rateCard.save();
  return rateCard;
};

export const findActivityRateCardById = async (
  id: string,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query: any = ActivityRateCard.findById(id);

  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  return await query;
};

export const updateActivityRateCard = async (id: string, data: any) => {
  return await ActivityRateCard.findByIdAndUpdate(id, data, { new: true });
};

export const deleteActivityRateCard = async (activityRateCardId: string) => {
  return await ActivityRateCard.findByIdAndUpdate(
    activityRateCardId,
    { status: 'inactive' },
    { new: true }
  );
};

export const getActivityRateCardList = async ({
  query,
  select = '',
  page,
  limit,
  sort = { createdAt: -1 },
  populate,
}: any) => {
  let rateQuery: any = ActivityRateCard.find(query)
    .select(select)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort(sort);

  if (populate && Array.isArray(populate)) {
    populate.forEach((field) => {
      rateQuery = rateQuery.populate(field);
    });
  }

  const data = await rateQuery.exec();
  const totalCount = await ActivityRateCard.countDocuments(query);

  return { data, totalCount };
};

export const findOneByQuery = async (query: any) => {
  return await ActivityRateCard.findOne(query);
};