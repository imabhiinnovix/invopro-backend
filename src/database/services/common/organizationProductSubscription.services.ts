import { PopulateOptions } from 'mongoose';
import organizationProductSubscription from '../../models/common/organizationProductSubscription';

export const getOrganizationProductsSubscription = async ({
  query,
  page = 1,
  limit = 20,
  sort = { createdAt: -1 },
  populate = [],
}: any) => {
  try {
    let queryBuilder = organizationProductSubscription
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate.length) {
      populate.forEach((field) => {
        queryBuilder = queryBuilder.populate(field);
      });
    }

    const data = await queryBuilder.exec();
    const totalCount = await organizationProductSubscription.countDocuments(query);

    return {
      data,
      totalCount,
    };
  } catch (err) {
    throw err;
  }
};

export const createOrganizationProductSubscription = async (organizationSubscriptionData: any) => {
  try {
    const organizationProductSubscriptionResp = new organizationProductSubscription(organizationSubscriptionData);
    await organizationProductSubscriptionResp.save();
    return organizationProductSubscriptionResp;
  } catch (err) {
    throw err;
  }
};

export const createManyOrganizationProductSubscription = async (organizationSubscriptionData: any[]) => {
  try {
    const result = await organizationProductSubscription.insertMany(organizationSubscriptionData);
    return result;
  } catch (err) {
    throw err;
  }
};

export const deleteManyOrganizationProductSubscription = async (organizationId) => {
  try {
    const result = await organizationProductSubscription.deleteMany({ organizationId });
    return result;
  } catch (err) {
    throw err;
  }
};

export const findOrganizationProductSubscription = async (
  organizationProductSubscriptionQuery,
  populateFields: (string | PopulateOptions)[] = []
) => {
  let query = organizationProductSubscription.find(organizationProductSubscriptionQuery);
  populateFields.forEach((field) => {
    const pop: PopulateOptions = typeof field === 'string' ? { path: field } : field;
    query = query.populate(pop);
  });

  const organizationProductSubscriptionDetails = await query;
  return organizationProductSubscriptionDetails;
};
